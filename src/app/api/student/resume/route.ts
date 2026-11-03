import { NextResponse } from "next/server";
import { requireApiRole, studentIdForUser } from "@/lib/auth";
import { countWords } from "@/lib/constants";
import { query } from "@/lib/db";
import { updateStudentResume } from "@/lib/matching";
import { fieldErrors, resumeSchema } from "@/lib/validation";

// GET /api/student/resume: the logged-in student's current resume text.
export async function GET() {
  const auth = await requireApiRole("STUDENT");
  if (auth instanceof NextResponse) return auth;

  const [row] = await query<{ resume_text: string | null; embedded_at: string | null }>(
    `SELECT s.resume_text,
            (SELECT MAX(created_at) FROM resume_embeddings r
              WHERE r.student_id = s.student_id AND r.is_current) AS embedded_at
     FROM students s WHERE s.user_id = $1`,
    [auth.userId],
  );
  return NextResponse.json({
    resume_text: row?.resume_text ?? "",
    word_count: countWords(row?.resume_text ?? ""),
    embedded_at: row?.embedded_at ?? null,
  });
}

// PUT /api/student/resume: save new resume text, embed it with the AI model,
// and refresh this student's job matches (one transaction for all writes).
export async function PUT(request: Request) {
  const auth = await requireApiRole("STUDENT");
  if (auth instanceof NextResponse) return auth;

  const body = await request.json().catch(() => null);
  const parsed = resumeSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Please fix your resume text.", fieldErrors: fieldErrors(parsed.error) },
      { status: 400 },
    );
  }

  const studentId = await studentIdForUser(auth.userId);
  if (!studentId) {
    return NextResponse.json({ error: "Student profile not found." }, { status: 404 });
  }

  try {
    await updateStudentResume(studentId, parsed.data.resume_text);
    return NextResponse.json({ ok: true, word_count: countWords(parsed.data.resume_text) });
  } catch (error) {
    console.error("Saving resume failed:", error);
    return NextResponse.json({ error: "Could not save your resume. Please try again." }, { status: 500 });
  }
}
