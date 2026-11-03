import ResumeEditor from "@/components/student/ResumeEditor";
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
    <main className="space-y-5">
      <header className="space-y-1">
        <h1 className="text-3xl font-bold tracking-tight">My resume</h1>
        <p className="opacity-70">
          Describe your skills, projects and experience in your own words (up to 300 words). An AI
          model on our server turns it into a 768-number vector that captures its meaning; jobs are
          then matched against that.
        </p>
        {row?.embedded_at && (
          <p className="text-sm opacity-60">
            Last analysed {formatDate(row.embedded_at)} with {row.model_name}.
          </p>
        )}
      </header>
      <ResumeEditor initialText={row?.resume_text?.trim() ?? ""} />
    </main>
  );
}
