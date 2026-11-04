import ResumeEditor from "@/components/student/ResumeEditor";
import PageHeader from "@/components/ui/PageHeader";
import { requireStudent } from "@/lib/auth";
import { query } from "@/lib/db";
import { formatDate } from "@/lib/format";

// Resume editor. Saving runs the AI model on the text and refreshes matches.
export default async function ResumePage() {
  const { studentId } = await requireStudent();
  const [row] = await query<{ resume_text: string | null; embedded_at: string | null; model_name: string | null }>(
    `SELECT s.resume_text, r.created_at AS embedded_at, r.model_name
     FROM students s
     LEFT JOIN resume_embeddings r ON r.student_id = s.student_id AND r.is_current
     WHERE s.student_id = $1`,
    [studentId],
  );

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
      <ResumeEditor initialText={row?.resume_text?.trim() ?? ""} />
      <p className="mt-3 text-[13px] text-muted">
        Write in plain sentences: skills, projects, internships, achievements. When you save, an AI model on our
        server turns the text into a 768-number vector that captures its meaning, and every job is compared with it.
        Your text never leaves this system.
      </p>
    </main>
  );
}
