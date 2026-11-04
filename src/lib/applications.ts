// Applying to jobs and reading a student's applications. Server-side only.
import { query, withTransaction } from "@/lib/db";

// Applies a student to a job: THE SHOWCASE TRANSACTION.
//   BEGIN
//   INSERT INTO applications ...   -> the trigger trg_check_eligibility fires:
//                                     checks OPEN / deadline / CGPA / branch and
//                                     stamps match_score via compute_match_score()
//   INSERT INTO application_rounds -> the student is queued for round 1
//   COMMIT  (or ROLLBACK if the trigger, a constraint or anything else fails)
export async function applyToJob(studentId: number, jobId: number) {
  return withTransaction(async (client) => {
    const inserted = await client.query<{ application_id: number; match_score: string | null }>(
      `INSERT INTO applications (student_id, job_id)
       VALUES ($1, $2)
       RETURNING application_id, match_score`,
      [studentId, jobId],
    );
    const { application_id, match_score } = inserted.rows[0];

    const firstRound = await client.query<{ round_name: string }>(
      `INSERT INTO application_rounds (application_id, round_id)
       SELECT $1, round_id FROM interview_rounds
       WHERE job_id = $2
       ORDER BY round_no
       LIMIT 1
       RETURNING (SELECT round_name FROM interview_rounds ir WHERE ir.round_id = application_rounds.round_id)`,
      [application_id, jobId],
    );

    return {
      applicationId: application_id,
      matchScore: match_score === null ? null : Number(match_score),
      firstRound: firstRound.rows[0]?.round_name ?? null,
    };
  });
}

// What went wrong when applying, from the PostgreSQL error.
//   P0001 = RAISE EXCEPTION in our trigger ("Not eligible: ...")
//   23505 = UNIQUE violation (already applied)
//   23503 = FOREIGN KEY violation (no such job)
export function describeApplyError(error: unknown): { status: number; message: string } | null {
  if (typeof error !== "object" || error === null) return null;
  const pgError = error as { code?: string; constraint?: string; message?: string };
  if (pgError.code === "P0001") return { status: 422, message: pgError.message ?? "Not eligible." };
  if (pgError.code === "23505" && pgError.constraint === "uq_app_student_job") {
    return { status: 409, message: "You have already applied to this job." };
  }
  if (pgError.code === "23503") return { status: 404, message: "This job does not exist." };
  return null;
}

// Withdraws one of the student's own applications. Only possible while it is
// still APPLIED or SHORTLISTED; offers and final decisions cannot be undone.
// The student_id condition means a student can never touch someone else's row.
export async function withdrawApplication(
  studentId: number,
  applicationId: number,
): Promise<"withdrawn" | "not_found" | "not_allowed"> {
  const updated = await query<{ application_id: number }>(
    `UPDATE applications
     SET status = 'WITHDRAWN'
     WHERE application_id = $1 AND student_id = $2 AND status IN ('APPLIED', 'SHORTLISTED')
     RETURNING application_id`,
    [applicationId, studentId],
  );
  if (updated.length) return "withdrawn";

  const [exists] = await query<{ status: string }>(
    `SELECT status FROM applications WHERE application_id = $1 AND student_id = $2`,
    [applicationId, studentId],
  );
  return exists ? "not_allowed" : "not_found";
}

export type StudentApplication = {
  application_id: number;
  status: string;
  match_score: number | null;
  applied_at: string;
  job_id: number;
  job_title: string;
  company_id: number;
  company_name: string;
  location: string | null;
  ctc: number | null;
  job_status: string;
  rounds_passed: number;
  total_rounds: number;
  rounds: {
    round_no: number;
    round_name: string;
    result: string | null; // null = not reached yet
    scheduled_at: string | null;
    feedback: string | null;
  }[];
};

// All of a student's applications, read from the VIEW vw_application_overview
// (triggers.sql), plus each job's interview rounds and this student's result
// in each, packed into one JSON array per application with json_agg.
export async function getStudentApplications(studentId: number): Promise<StudentApplication[]> {
  const rows = await query<
    Omit<StudentApplication, "match_score" | "ctc" | "rounds_passed" | "total_rounds"> & {
      match_score: string | null;
      ctc: string | null;
      rounds_passed: string;
      total_rounds: string;
    }
  >(
    `SELECT v.application_id, v.status, v.match_score, v.applied_at,
            v.job_id, v.job_title, v.company_id, v.company_name, v.location, v.ctc, v.job_status,
            v.rounds_passed, v.total_rounds,
            COALESCE((
              SELECT json_agg(json_build_object(
                       'round_no',     ir.round_no,
                       'round_name',   ir.round_name,
                       'result',       ar.result,
                       'scheduled_at', ar.scheduled_at,
                       'feedback',     ar.feedback) ORDER BY ir.round_no)
              FROM interview_rounds ir
              LEFT JOIN application_rounds ar
                     ON ar.round_id = ir.round_id AND ar.application_id = v.application_id
              WHERE ir.job_id = v.job_id
            ), '[]'::json) AS rounds
     FROM vw_application_overview v
     WHERE v.student_id = $1
     ORDER BY v.applied_at DESC`,
    [studentId],
  );
  return rows.map((row) => ({
    ...row,
    match_score: row.match_score === null ? null : Number(row.match_score),
    ctc: row.ctc === null ? null : Number(row.ctc),
    rounds_passed: Number(row.rounds_passed),
    total_rounds: Number(row.total_rounds),
  }));
}
