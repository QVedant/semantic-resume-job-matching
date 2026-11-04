import ResumeEditor from "@/components/student/ResumeEditor";
import PageHeader from "@/components/ui/PageHeader";
import { requireStudent } from "@/lib/auth";
import { query } from "@/lib/db";
import { formatDate } from "@/lib/format";
import { getResumeFileInfo, resumePdfUrl } from "@/lib/resumeFiles";

// Resume page: upload a PDF (stored in the database) and edit the text the AI
// matches on. Saving the text runs the AI model and refreshes matches.
export default async function ResumePage() {
  const { studentId } = await requireStudent();
  const [[row], file] = await Promise.all([
    query<{ resume_text: string | null; embedded_at: string | null; model_name: string | null }>(
      `SELECT s.resume_text, r.created_at AS embedded_at, r.model_name
       FROM students s
       LEFT JOIN resume_embeddings r ON r.student_id = s.student_id AND r.is_current
       WHERE s.student_id = $1`,
      [studentId],
    ),
    getResumeFileInfo(studentId),
  ]);

  return (
    <main className="max-w-3xl">
      <PageHeader
        title="My"
        accent="resume"
        description={
          row?.embedded_at ? (
            <>
              Last analysed <strong>{formatDate(row.embedded_at)}</strong> with <strong>{row.model_name}</strong>
            </>
          ) : (
            "Not analysed yet"
          )
        }
      />
      <ResumeEditor
        initialText={row?.resume_text?.trim() ?? ""}
        initialFile={file ? { ...file, uploaded_at: new Date(file.uploaded_at).toISOString() } : null}
        pdfUrl={resumePdfUrl(studentId)}
      />
      <p className="mt-3 text-[13px] text-muted">
        The AI matches on the text, not the PDF layout, and reads about 300 words, so keep the strongest parts:
        skills, projects, internships. When you save, a model on our server turns the text into a 768-number vector
        that captures its meaning. Your resume never leaves this system.
      </p>
    </main>
  );
}
