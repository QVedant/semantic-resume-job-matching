// Recruiter-side data: posting jobs, managing them, and reviewing applicants.
// Server-side only. Every query is limited to jobs the recruiter posted
// (posted_by = their recruiter_id), so one recruiter can never see or change
// another company's jobs or applicants.
import { redirect } from "next/navigation";
import { NextResponse } from "next/server";
import { requireApiRole, requireRole } from "@/lib/auth";
import { query, withTransaction } from "@/lib/db";
import { embedText } from "@/lib/embeddings";
import { buildJobText, refreshJobMatches, saveJobEmbedding } from "@/lib/matching";
import type { Session } from "@/lib/session";
import type { JobInput } from "@/lib/validation";

export type Recruiter = { recruiterId: number; companyId: number; companyName: string };

export async function recruiterForUser(userId: number): Promise<Recruiter | null> {
  const [row] = await query<{ recruiter_id: number; company_id: number; company_name: string }>(
    `SELECT r.recruiter_id, r.company_id, c.name AS company_name
     FROM recruiters r JOIN companies c ON c.company_id = r.company_id
     WHERE r.user_id = $1`,
    [userId],
  );
  return row ? { recruiterId: row.recruiter_id, companyId: row.company_id, companyName: row.company_name } : null;
}

// For recruiter pages: the session plus the recruiter's own ids.
export async function requireRecruiter(): Promise<{ session: Session } & Recruiter> {
  const session = await requireRole("RECRUITER");
  const recruiter = await recruiterForUser(session.userId);
  if (!recruiter) redirect("/login");
  return { session, ...recruiter };
}

// For recruiter API routes: the session + recruiter, or a ready 401/403/404 response.
export async function requireApiRecruiter(): Promise<({ session: Session } & Recruiter) | NextResponse> {
  const auth = await requireApiRole("RECRUITER");
  if (auth instanceof NextResponse) return auth;
  const recruiter = await recruiterForUser(auth.userId);
  if (!recruiter) return NextResponse.json({ error: "Recruiter profile not found." }, { status: 404 });
  return { session: auth, ...recruiter };
}

// Reads a positive integer id from a dynamic route segment like /jobs/[id].
export function parseId(raw: string): number | null {
  const id = Number(raw);
  return Number.isInteger(id) && id > 0 ? id : null;
}

// ---------------------------------------------------------------------
// Jobs
// ---------------------------------------------------------------------

export type RecruiterJob = {
  job_id: number;
  title: string;
  location: string | null;
  ctc: number | null;
  status: string;
  deadline: string | null;
  created_at: string;
  applicants: number;
  to_review: number;
  shortlisted: number;
  offers: number;
};

// The recruiter's jobs with applicant counts per status
// (LEFT JOIN + GROUP BY + COUNT ... FILTER).
export async function getRecruiterJobs(recruiterId: number): Promise<RecruiterJob[]> {
  const rows = await query<Omit<RecruiterJob, "ctc"> & { ctc: string | null }>(
    `SELECT j.job_id, j.title, j.location, j.ctc, j.status::text AS status, j.deadline, j.created_at,
            COUNT(a.application_id)::int                                              AS applicants,
            COUNT(*) FILTER (WHERE a.status = 'APPLIED')::int                         AS to_review,
            COUNT(*) FILTER (WHERE a.status = 'SHORTLISTED')::int                     AS shortlisted,
            COUNT(*) FILTER (WHERE a.status IN ('OFFERED', 'HIRED'))::int             AS offers
     FROM job_postings j
     LEFT JOIN applications a ON a.job_id = j.job_id
     WHERE j.posted_by = $1
     GROUP BY j.job_id
     ORDER BY CASE j.status WHEN 'OPEN' THEN 0 WHEN 'DRAFT' THEN 1 ELSE 2 END, j.created_at DESC`,
    [recruiterId],
  );
  return rows.map((row) => ({ ...row, ctc: row.ctc === null ? null : Number(row.ctc) }));
}

// Posts a new job: THE "POST JOB + EMBEDDING" TRANSACTION.
// The AI model runs first (outside the transaction, it takes ~1 s). Then ONE
// transaction saves the job, its skills, its interview rounds, its embedding
// and (if it is OPEN) its match scores for every student. If any step fails,
// nothing is saved, so there is never a job without skills or without a vector.
export async function createJob(recruiter: Recruiter, input: JobInput): Promise<number> {
  // Skill names, most important first (same order as jobEmbeddingText uses).
  const skillRows = input.skills.length
    ? await query<{ skill_id: number; name: string }>(
        `SELECT skill_id, name FROM skills WHERE skill_id = ANY ($1::int[])`,
        [input.skills.map((s) => s.skill_id)],
      )
    : [];
  const weightOf = new Map(input.skills.map((s) => [s.skill_id, s.weight]));
  const skillNames = skillRows
    .sort((a, b) => weightOf.get(b.skill_id)! - weightOf.get(a.skill_id)! || a.name.localeCompare(b.name))
    .map((row) => row.name);
  const vector = await embedText(buildJobText(input.title, input.description, skillNames));

  return withTransaction(async (client) => {
    const inserted = await client.query<{ job_id: number }>(
      `INSERT INTO job_postings
         (company_id, posted_by, title, description, location, ctc, min_cgpa, eligible_branches, deadline, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING job_id`,
      [
        recruiter.companyId,
        recruiter.recruiterId,
        input.title,
        input.description,
        input.location,
        input.ctc_lpa * 100000,
        input.min_cgpa,
        input.eligible_branches.join(","),
        input.deadline,
        input.status,
      ],
    );
    const jobId = inserted.rows[0].job_id;

    // unnest() turns the two arrays into rows: one INSERT for all skills.
    if (input.skills.length) {
      await client.query(
        `INSERT INTO job_skills (job_id, skill_id, weight)
         SELECT $1, skill_id, weight
         FROM unnest($2::int[], $3::numeric[]) AS t(skill_id, weight)`,
        [jobId, input.skills.map((s) => s.skill_id), input.skills.map((s) => s.weight)],
      );
    }
    // WITH ORDINALITY numbers the rounds 1, 2, 3 in the order they were entered.
    if (input.rounds.length) {
      await client.query(
        `INSERT INTO interview_rounds (job_id, round_no, round_name, round_type)
         SELECT $1, t.round_no, t.round_name, t.round_type::interview_round_type
         FROM unnest($2::text[], $3::text[]) WITH ORDINALITY AS t(round_name, round_type, round_no)`,
        [jobId, input.rounds.map((r) => r.round_name), input.rounds.map((r) => r.round_type)],
      );
    }

    await saveJobEmbedding(client, jobId, vector);
    await refreshJobMatches(client, jobId); // only creates rows if the job is OPEN
    return jobId;
  });
}

// Publishes (DRAFT -> OPEN) or closes (OPEN -> CLOSED) a job, and refreshes
// its match scores in the same transaction: open jobs get recommendation
// rows, closed jobs lose them.
export async function setJobStatus(
  recruiterId: number,
  jobId: number,
  status: "OPEN" | "CLOSED",
): Promise<"updated" | "not_found" | "not_allowed"> {
  const allowedFrom = status === "OPEN" ? ["DRAFT"] : ["OPEN", "DRAFT"];
  return withTransaction(async (client) => {
    const updated = await client.query(
      `UPDATE job_postings SET status = $1
       WHERE job_id = $2 AND posted_by = $3 AND status::text = ANY ($4::text[])`,
      [status, jobId, recruiterId, allowedFrom],
    );
    if (updated.rowCount === 0) {
      const exists = await client.query(`SELECT 1 FROM job_postings WHERE job_id = $1 AND posted_by = $2`, [
        jobId,
        recruiterId,
      ]);
      return exists.rowCount ? "not_allowed" : "not_found";
    }
    await refreshJobMatches(client, jobId);
    return "updated";
  });
}

// ---------------------------------------------------------------------
// Applicants
// ---------------------------------------------------------------------

export type Applicant = {
  application_id: number;
  rank: number;
  status: string;
  match_score: number | null;
  applied_at: string;
  student_id: number;
  full_name: string;
  usn: string;
  branch: string;
  cgpa: string;
  resume_text: string | null;
  skills: string | null;
  rounds: { round_id: number; round_no: number; round_name: string; result: string | null; feedback: string | null }[];
};

export type RecruiterJobDetail = {
  job_id: number;
  title: string;
  description: string | null;
  location: string | null;
  ctc: string | null;
  min_cgpa: string | null;
  eligible_branches: string | null;
  deadline: string | null;
  status: string;
  applicants: Applicant[];
};

// One of the recruiter's jobs with its applicants RANKED BY MATCH SCORE.
// RANK() OVER (...) is a window function: it numbers the rows 1, 2, 3 by
// score without grouping them, so equal scores share a rank.
export async function getJobWithApplicants(recruiterId: number, jobId: number): Promise<RecruiterJobDetail | null> {
  const [job] = await query<Omit<RecruiterJobDetail, "applicants">>(
    `SELECT job_id, title, description, location, ctc, min_cgpa, eligible_branches, deadline, status::text AS status
     FROM job_postings WHERE job_id = $1 AND posted_by = $2`,
    [jobId, recruiterId],
  );
  if (!job) return null;

  const applicants = await query<Omit<Applicant, "match_score" | "rank"> & { match_score: string | null; rank: string }>(
    `SELECT a.application_id,
            RANK() OVER (ORDER BY a.match_score DESC NULLS LAST) AS rank,
            a.status::text AS status, a.match_score, a.applied_at,
            s.student_id, s.full_name, s.usn, s.branch, s.cgpa, s.resume_text,
            (SELECT string_agg(sk.name || ' (' || lower(ss.proficiency::text) || ')', ', ' ORDER BY sk.name)
               FROM student_skills ss JOIN skills sk ON sk.skill_id = ss.skill_id
              WHERE ss.student_id = s.student_id) AS skills,
            COALESCE((
              SELECT json_agg(json_build_object(
                       'round_id', ir.round_id, 'round_no', ir.round_no, 'round_name', ir.round_name,
                       'result', ar.result, 'feedback', ar.feedback) ORDER BY ir.round_no)
              FROM interview_rounds ir
              LEFT JOIN application_rounds ar
                     ON ar.round_id = ir.round_id AND ar.application_id = a.application_id
              WHERE ir.job_id = a.job_id
            ), '[]'::json) AS rounds
     FROM applications a
     JOIN students s ON s.student_id = a.student_id
     WHERE a.job_id = $1
     ORDER BY a.match_score DESC NULLS LAST, a.applied_at`,
    [jobId],
  );

  return {
    ...job,
    applicants: applicants.map((row) => ({
      ...row,
      rank: Number(row.rank),
      match_score: row.match_score === null ? null : Number(row.match_score),
    })),
  };
}

// The status changes a recruiter may make, and from which statuses.
// WITHDRAWN applications are the student's decision and can't be changed.
export const STATUS_TRANSITIONS: Record<string, string[]> = {
  SHORTLISTED: ["APPLIED"],
  REJECTED: ["APPLIED", "SHORTLISTED", "OFFERED"],
  OFFERED: ["SHORTLISTED"],
  HIRED: ["OFFERED"],
};

// Changes an applicant's status, recording who reviewed it and when.
export async function updateApplicationStatus(
  recruiterId: number,
  reviewerUserId: number,
  applicationId: number,
  status: string,
): Promise<"updated" | "not_found" | "not_allowed"> {
  const updated = await query<{ application_id: number }>(
    `UPDATE applications a
     SET status = $1::application_status, reviewed_by = $2, reviewed_at = CURRENT_TIMESTAMP
     FROM job_postings j
     WHERE a.application_id = $3
       AND j.job_id = a.job_id AND j.posted_by = $4
       AND a.status::text = ANY ($5::text[])
     RETURNING a.application_id`,
    [status, reviewerUserId, applicationId, recruiterId, STATUS_TRANSITIONS[status] ?? []],
  );
  if (updated.length) return "updated";
  return (await applicationBelongsTo(recruiterId, applicationId)) ? "not_allowed" : "not_found";
}

async function applicationBelongsTo(recruiterId: number, applicationId: number): Promise<boolean> {
  const rows = await query(
    `SELECT 1 FROM applications a JOIN job_postings j ON j.job_id = a.job_id
     WHERE a.application_id = $1 AND j.posted_by = $2`,
    [applicationId, recruiterId],
  );
  return rows.length > 0;
}

// Records an interview round result: ONE TRANSACTION.
//   - save PASSED/REJECTED + feedback for the round (UPSERT: insert, or
//     update if the row already exists: INSERT ... ON CONFLICT DO UPDATE)
//   - PASSED   -> queue the student for the next round (if any), and move
//                 an APPLIED application to SHORTLISTED
//   - REJECTED -> the application becomes REJECTED
export async function recordRoundResult(
  recruiterId: number,
  reviewerUserId: number,
  applicationId: number,
  roundId: number,
  result: "PASSED" | "REJECTED",
  feedback: string | null,
): Promise<"saved" | "not_found" | "not_allowed" | "out_of_order"> {
  return withTransaction(async (client) => {
    const found = await client.query<{ job_id: number; status: string; round_no: number }>(
      `SELECT a.job_id, a.status::text AS status, ir.round_no
       FROM applications a
       JOIN job_postings j      ON j.job_id = a.job_id AND j.posted_by = $3
       JOIN interview_rounds ir ON ir.job_id = a.job_id AND ir.round_id = $2
       WHERE a.application_id = $1
       FOR UPDATE OF a`, // lock the application row until COMMIT
      [applicationId, roundId, recruiterId],
    );
    if (found.rowCount === 0) return "not_found";
    const { job_id, status, round_no } = found.rows[0];
    if (status !== "APPLIED" && status !== "SHORTLISTED") return "not_allowed";

    // Rounds happen in order: every earlier round must already be PASSED.
    // (IS DISTINCT FROM also counts a missing row, i.e. NULL, as "not passed".)
    const earlierNotPassed = await client.query(
      `SELECT 1
       FROM interview_rounds ir
       LEFT JOIN application_rounds ar
              ON ar.round_id = ir.round_id AND ar.application_id = $1
       WHERE ir.job_id = $2 AND ir.round_no < $3
         AND ar.result IS DISTINCT FROM 'PASSED'`,
      [applicationId, job_id, round_no],
    );
    if (earlierNotPassed.rowCount) return "out_of_order";

    await client.query(
      `INSERT INTO application_rounds (application_id, round_id, result, feedback)
       VALUES ($1, $2, $3::round_result, $4)
       ON CONFLICT (application_id, round_id)
       DO UPDATE SET result = EXCLUDED.result, feedback = EXCLUDED.feedback`,
      [applicationId, roundId, result, feedback],
    );

    if (result === "PASSED") {
      await client.query(
        `INSERT INTO application_rounds (application_id, round_id)
         SELECT $1, round_id FROM interview_rounds WHERE job_id = $2 AND round_no = $3 + 1
         ON CONFLICT (application_id, round_id) DO NOTHING`,
        [applicationId, job_id, round_no],
      );
      await client.query(
        `UPDATE applications SET status = 'SHORTLISTED', reviewed_by = $2, reviewed_at = CURRENT_TIMESTAMP
         WHERE application_id = $1 AND status = 'APPLIED'`,
        [applicationId, reviewerUserId],
      );
    } else {
      await client.query(
        `UPDATE applications SET status = 'REJECTED', reviewed_by = $2, reviewed_at = CURRENT_TIMESTAMP
         WHERE application_id = $1`,
        [applicationId, reviewerUserId],
      );
    }
    return "saved";
  });
}

// Every skill, for the "required skills" picker on the post-a-job form.
export async function allSkills(): Promise<{ skill_id: number; name: string; category: string | null }[]> {
  return query(`SELECT skill_id, name, category FROM skills ORDER BY category, name`);
}
