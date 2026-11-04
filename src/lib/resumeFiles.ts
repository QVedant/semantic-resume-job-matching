// Resume PDFs: reading their text, storing them in PostgreSQL (resume_files)
// and deciding who may download them. Server-side only.
import { extractText } from "unpdf";
import { query, withTransaction } from "@/lib/db";
import type { Session } from "@/lib/session";

// The web address where a student's PDF can be downloaded (through our API,
// which checks permissions). Stored in students.resume_url.
export const resumePdfUrl = (studentId: number) => `/api/resumes/${studentId}`;

// True if the bytes start with "%PDF-", the signature of every real PDF.
// The database checks the same thing (chk_resume_file_signature).
export function looksLikePdf(bytes: Uint8Array): boolean {
  return bytes.length >= 5 && String.fromCharCode(...bytes.slice(0, 5)) === "%PDF-";
}

// Pulls the readable text out of a PDF. Returns "" for scanned PDFs (pages
// that are only images contain no text). Throws if the file is not a valid PDF.
export async function extractPdfText(bytes: Uint8Array): Promise<string> {
  // pdf.js may take ownership of the buffer it is given, so pass a copy.
  const { text } = await extractText(new Uint8Array(bytes), { mergePages: true });
  return text
    .replace(/\r/g, "")
    .replace(/[ \t]+/g, " ") // runs of spaces -> one space
    .replace(/ *\n */g, "\n") // trim spaces around line breaks
    .replace(/\n{3,}/g, "\n\n") // at most one empty line in a row
    .trim();
}

// Saves (or replaces) a student's PDF and points students.resume_url at it,
// in ONE transaction, so the file and the link can never get out of sync.
// INSERT ... ON CONFLICT DO UPDATE ("upsert"): a second upload replaces the first.
export async function saveResumePdf(studentId: number, fileName: string, bytes: Uint8Array) {
  await withTransaction(async (client) => {
    await client.query(
      `INSERT INTO resume_files (student_id, file_name, mime_type, size_bytes, content)
       VALUES ($1, $2, 'application/pdf', $3, $4)
       ON CONFLICT (student_id) DO UPDATE
         SET file_name   = EXCLUDED.file_name,
             size_bytes  = EXCLUDED.size_bytes,
             content     = EXCLUDED.content,
             uploaded_at = CURRENT_TIMESTAMP`,
      [studentId, fileName, bytes.length, Buffer.from(bytes)],
    );
    await client.query(`UPDATE students SET resume_url = $1 WHERE student_id = $2`, [
      resumePdfUrl(studentId),
      studentId,
    ]);
  });
}

// Removes a student's PDF and clears the link (one transaction).
export async function deleteResumePdf(studentId: number): Promise<boolean> {
  return withTransaction(async (client) => {
    const deleted = await client.query(`DELETE FROM resume_files WHERE student_id = $1`, [studentId]);
    await client.query(`UPDATE students SET resume_url = NULL WHERE student_id = $1`, [studentId]);
    return (deleted.rowCount ?? 0) > 0;
  });
}

export type ResumeFileInfo = { file_name: string; size_bytes: number; uploaded_at: string };

// Details of a student's stored PDF (without the file itself), or null.
export async function getResumeFileInfo(studentId: number): Promise<ResumeFileInfo | null> {
  const [row] = await query<ResumeFileInfo>(
    `SELECT file_name, size_bytes, uploaded_at FROM resume_files WHERE student_id = $1`,
    [studentId],
  );
  return row ?? null;
}

// Who may download a student's PDF:
//   - the student themselves
//   - a placement officer
//   - a recruiter, only if the student applied to one of THEIR jobs
// The whole rule is one SQL query, so the file is only returned if allowed.
export async function getResumePdfForViewer(session: Session, studentId: number) {
  const [row] = await query<{ file_name: string; content: Buffer }>(
    `SELECT f.file_name, f.content
     FROM resume_files f
     JOIN students s ON s.student_id = f.student_id
     WHERE f.student_id = $1
       AND (
             ($2 = 'STUDENT'           AND s.user_id = $3)
          OR ($2 = 'PLACEMENT_OFFICER')
          OR ($2 = 'RECRUITER' AND EXISTS (
                SELECT 1
                FROM applications a
                JOIN job_postings j ON j.job_id       = a.job_id
                JOIN recruiters   r ON r.recruiter_id = j.posted_by
                WHERE a.student_id = f.student_id AND r.user_id = $3))
           )`,
    [studentId, session.role, session.userId],
  );
  return row ?? null;
}
