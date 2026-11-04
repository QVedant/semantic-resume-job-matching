import { NextResponse } from "next/server";
import { requireApiRole, studentIdForUser } from "@/lib/auth";
import { MAX_PDF_BYTES, countWords } from "@/lib/constants";
import { deleteResumePdf, extractPdfText, looksLikePdf, saveResumePdf } from "@/lib/resumeFiles";

// Keeps only the file's own name (no folders) and safe characters.
function cleanFileName(name: string): string {
  const base = name.split(/[\\/]/).pop() ?? "";
  const cleaned = base.replace(/[^\w.\- ()]/g, "_").slice(0, 200).trim();
  return cleaned.toLowerCase().endsWith(".pdf") ? cleaned : `${cleaned || "resume"}.pdf`;
}

// POST /api/student/resume/pdf   (multipart form, field "file")
// Stores the student's resume PDF in the database and returns its text, so
// the page can put it in the resume box for the student to review and save.
// The text is NOT saved or embedded here: the student checks it first
// (and trims it to 300 words), then presses Save as usual.
export async function POST(request: Request) {
  const auth = await requireApiRole("STUDENT");
  if (auth instanceof NextResponse) return auth;
  const studentId = await studentIdForUser(auth.userId);
  if (!studentId) return NextResponse.json({ error: "Student profile not found." }, { status: 404 });

  const form = await request.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json({ error: "Choose a PDF file to upload." }, { status: 400 });
  }
  if (file.size > MAX_PDF_BYTES) {
    return NextResponse.json({ error: "The PDF must be 2 MB or smaller." }, { status: 413 });
  }

  const bytes = new Uint8Array(await file.arrayBuffer());
  // Check the content, not just the name: a real PDF starts with "%PDF-".
  if (!looksLikePdf(bytes)) {
    return NextResponse.json({ error: "That file isn't a PDF. Export your resume as a PDF and try again." }, { status: 415 });
  }

  let text: string;
  try {
    text = await extractPdfText(bytes);
  } catch {
    return NextResponse.json(
      { error: "This PDF couldn't be read. It may be damaged or password-protected." },
      { status: 422 },
    );
  }

  const fileName = cleanFileName(file.name);
  await saveResumePdf(studentId, fileName, bytes);

  return NextResponse.json(
    {
      file: { file_name: fileName, size_bytes: bytes.length, uploaded_at: new Date().toISOString() },
      text,
      word_count: countWords(text),
      notice: text
        ? null
        : "Your PDF was saved, but it contains no selectable text (it may be a scanned image). Type or paste your resume below.",
    },
    { status: 201 },
  );
}

// DELETE /api/student/resume/pdf: removes the stored PDF.
export async function DELETE() {
  const auth = await requireApiRole("STUDENT");
  if (auth instanceof NextResponse) return auth;
  const studentId = await studentIdForUser(auth.userId);
  if (!studentId) return NextResponse.json({ error: "Student profile not found." }, { status: 404 });

  const removed = await deleteResumePdf(studentId);
  return removed
    ? NextResponse.json({ ok: true })
    : NextResponse.json({ error: "There's no uploaded PDF to remove." }, { status: 404 });
}
