// Job queries for the student pages: search (keyword / by meaning /
// recommended for my resume) and the job detail page. Server-side only.
import { query, toVector } from "@/lib/db";
import { embedText } from "@/lib/embeddings";

export type JobSearchMode = "recommended" | "meaning" | "keyword";

export type JobFilters = {
  mode: JobSearchMode;
  q?: string; // keyword text, or the sentence to search by meaning
  location?: string;
  minCtcLpa?: number;
  eligibleOnly?: boolean;
  limit?: number;
};

export type JobListing = {
  job_id: number;
  title: string;
  company: string;
  location: string | null;
  ctc: number | null;
  min_cgpa: number | null;
  eligible_branches: string | null;
  deadline: string | null;
  similarity: number | null; // to the search sentence (meaning mode) or to my resume
  match_score: number | null; // compute_match_score(): resume similarity + CGPA
  cgpa_ok: boolean;
  branch_ok: boolean;
  deadline_ok: boolean;
  eligible: boolean;
  already_applied: boolean;
};

// The same eligibility rules as the trigger, written as SQL expressions over
// the student (me) and the job (j). Used to label jobs and to filter them.
const CGPA_OK = `(j.min_cgpa IS NULL OR me.cgpa >= j.min_cgpa)`;
const BRANCH_OK = `(j.eligible_branches IS NULL
                    OR me.branch = ANY (string_to_array(replace(j.eligible_branches, ' ', ''), ',')))`;
const DEADLINE_OK = `(j.deadline IS NULL OR j.deadline >= CURRENT_DATE)`;

// The logged-in student's CGPA, branch and current resume vector (NULL if none yet).
const ME_CTE = `
  WITH me AS (
    SELECT s.student_id, s.cgpa, s.branch, r.embedding
    FROM students s
    LEFT JOIN resume_embeddings r ON r.student_id = s.student_id AND r.is_current
    WHERE s.student_id = $1
  )`;

// Escapes % and _ so a search for "C++_dev" matches literally in ILIKE.
function escapeLike(text: string): string {
  return text.replace(/[\\%_]/g, (ch) => `\\${ch}`);
}

type JobListingRow = Omit<JobListing, "ctc" | "min_cgpa" | "similarity" | "match_score" | "eligible"> & {
  ctc: string | null;
  min_cgpa: string | null;
  similarity: string | null;
  match_score: string | null;
};

// pg returns DECIMAL columns as strings; convert them to numbers.
function toListing(row: JobListingRow): JobListing {
  const num = (value: string | null) => (value === null ? null : Number(value));
  return {
    ...row,
    ctc: num(row.ctc),
    min_cgpa: num(row.min_cgpa),
    similarity: num(row.similarity),
    match_score: num(row.match_score),
    eligible: row.cgpa_ok && row.branch_ok && row.deadline_ok,
  };
}

// Searches OPEN jobs for one student.
//   recommended : ordered by closeness to the student's resume vector
//   meaning     : the search sentence is embedded right now, and jobs are
//                 ordered by closeness to it (pgvector <=> cosine distance)
//   keyword     : ILIKE text search, ordered by match score
// The WHERE clause is assembled from fixed SQL fragments only; every user
// value goes in as a $n parameter, so this stays safe from SQL injection.
export async function searchJobs(studentId: number, filters: JobFilters): Promise<JobListing[]> {
  const params: unknown[] = [studentId];
  const param = (value: unknown) => {
    params.push(value);
    return `$${params.length}`;
  };

  const where = [`j.status = 'OPEN'`];
  let distance = `je.embedding <=> me.embedding`;

  const q = filters.q?.trim();
  if (filters.mode === "meaning" && q) {
    const vector = await embedText(q);
    distance = `je.embedding <=> ${param(toVector(vector))}::vector`;
  }
  if (filters.mode === "keyword" && q) {
    const pattern = param(`%${escapeLike(q)}%`);
    where.push(`(j.title ILIKE ${pattern} OR c.name ILIKE ${pattern} OR j.description ILIKE ${pattern})`);
  }
  if (filters.location) where.push(`j.location = ${param(filters.location)}`);
  if (filters.minCtcLpa && filters.minCtcLpa > 0) where.push(`j.ctc >= ${param(filters.minCtcLpa * 100000)}`);
  if (filters.eligibleOnly) where.push(`${CGPA_OK} AND ${BRANCH_OK} AND ${DEADLINE_OK}`);

  const orderBy =
    filters.mode === "keyword" ? `match_score DESC NULLS LAST, j.deadline` : `${distance} NULLS LAST`;
  const limit = param(Math.min(filters.limit ?? 50, 100));

  const rows = await query<JobListingRow>(
    `${ME_CTE}
     SELECT j.job_id, j.title, c.name AS company, j.location, j.ctc, j.min_cgpa,
            j.eligible_branches, j.deadline,
            ROUND((1 - (${distance}))::numeric, 4)        AS similarity,
            compute_match_score(me.student_id, j.job_id)  AS match_score,
            ${CGPA_OK}                                    AS cgpa_ok,
            ${BRANCH_OK}                                  AS branch_ok,
            ${DEADLINE_OK}                                AS deadline_ok,
            EXISTS (SELECT 1 FROM applications a
                     WHERE a.student_id = me.student_id AND a.job_id = j.job_id) AS already_applied
     FROM me
     CROSS JOIN job_postings j
     JOIN companies c ON c.company_id = j.company_id
     LEFT JOIN job_embeddings je ON je.job_id = j.job_id AND je.is_current
     WHERE ${where.join(" AND ")}
     ORDER BY ${orderBy}
     LIMIT ${limit}`,
    params,
  );
  return rows.map(toListing);
}

// Locations of open jobs, for the filter dropdown.
export async function openJobLocations(): Promise<string[]> {
  const rows = await query<{ location: string }>(
    `SELECT DISTINCT location FROM job_postings
     WHERE status = 'OPEN' AND location IS NOT NULL ORDER BY location`,
  );
  return rows.map((row) => row.location);
}

export type JobDetail = JobListing & {
  description: string | null;
  status: string;
  industry: string | null;
  website: string | null;
  my_status: string | null; // this student's application status, if applied
  skills: { name: string; weight: number; my_level: string | null }[];
  rounds: { round_no: number; round_name: string; round_type: string }[];
};

// One job with everything the detail page shows: eligibility, match score,
// required skills marked as "you have it / missing" (a skill-gap check), and
// the interview rounds. Draft jobs are private to the recruiter, so not shown.
export async function getJobDetail(studentId: number, jobId: number): Promise<JobDetail | null> {
  const [row] = await query<JobListingRow & Omit<JobDetail, keyof JobListing | "skills" | "rounds">>(
    `${ME_CTE}
     SELECT j.job_id, j.title, c.name AS company, j.location, j.ctc, j.min_cgpa,
            j.eligible_branches, j.deadline, j.description, j.status,
            c.industry, c.website,
            ROUND((1 - (je.embedding <=> me.embedding))::numeric, 4) AS similarity,
            compute_match_score(me.student_id, j.job_id)             AS match_score,
            ${CGPA_OK}                                               AS cgpa_ok,
            ${BRANCH_OK}                                             AS branch_ok,
            ${DEADLINE_OK}                                           AS deadline_ok,
            a.status IS NOT NULL                                     AS already_applied,
            a.status                                                 AS my_status
     FROM me
     CROSS JOIN job_postings j
     JOIN companies c ON c.company_id = j.company_id
     LEFT JOIN job_embeddings je ON je.job_id = j.job_id AND je.is_current
     LEFT JOIN applications   a  ON a.job_id = j.job_id AND a.student_id = me.student_id
     WHERE j.job_id = $2 AND j.status <> 'DRAFT'`,
    [studentId, jobId],
  );
  if (!row) return null;

  const skills = await query<{ name: string; weight: string; my_level: string | null }>(
    `SELECT sk.name, js.weight, ss.proficiency::text AS my_level
     FROM job_skills js
     JOIN skills sk ON sk.skill_id = js.skill_id
     LEFT JOIN student_skills ss ON ss.skill_id = js.skill_id AND ss.student_id = $2
     WHERE js.job_id = $1
     ORDER BY js.weight DESC, sk.name`,
    [jobId, studentId],
  );
  const rounds = await query<{ round_no: number; round_name: string; round_type: string }>(
    `SELECT round_no, round_name, round_type::text AS round_type
     FROM interview_rounds WHERE job_id = $1 ORDER BY round_no`,
    [jobId],
  );

  return {
    ...toListing(row),
    description: row.description,
    status: row.status,
    industry: row.industry,
    website: row.website,
    my_status: row.my_status,
    skills: skills.map((s) => ({ ...s, weight: Number(s.weight) })),
    rounds,
  };
}
