// Placement officer queries: campus-wide statistics and searchable lists.
// Server-side only. Most of them read the VIEW vw_application_overview
// (triggers.sql), which already joins applications + students + jobs +
// companies + reviewer, so these queries stay short.
import { query } from "@/lib/db";

const num = (value: string | null) => (value === null ? null : Number(value));

export type Overview = {
  students: number;
  placed: number;
  open_jobs: number;
  companies: number;
  applications: number;
  avg_match: number | null;
  highest_offer: number | null;
};

// Headline numbers for the dashboard.
export async function getOverview(): Promise<Overview> {
  const [row] = await query<Omit<Overview, "avg_match" | "highest_offer"> & { avg_match: string | null; highest_offer: string | null }>(
    `SELECT (SELECT COUNT(*)::int FROM students)                                           AS students,
            (SELECT COUNT(DISTINCT student_id)::int FROM vw_application_overview
              WHERE status IN ('OFFERED', 'HIRED'))                                        AS placed,
            (SELECT COUNT(*)::int FROM job_postings WHERE status = 'OPEN')                  AS open_jobs,
            (SELECT COUNT(*)::int FROM companies)                                          AS companies,
            (SELECT COUNT(*)::int FROM vw_application_overview)                            AS applications,
            (SELECT ROUND(AVG(match_score), 4) FROM vw_application_overview)               AS avg_match,
            (SELECT MAX(ctc) FROM vw_application_overview WHERE status IN ('OFFERED', 'HIRED')) AS highest_offer`,
  );
  return { ...row, avg_match: num(row.avg_match), highest_offer: num(row.highest_offer) };
}

export type BranchStat = {
  branch: string;
  students: number;
  applied: number;
  placed: number;
  avg_cgpa: number;
  placement_pct: number;
};

// Placement report per branch. LEFT JOIN keeps students with no applications;
// COUNT(DISTINCT ...) FILTER counts each placed student once.
export async function getBranchStats(): Promise<BranchStat[]> {
  const rows = await query<Omit<BranchStat, "avg_cgpa" | "placement_pct"> & { avg_cgpa: string; placement_pct: string }>(
    `SELECT s.branch,
            COUNT(DISTINCT s.student_id)::int                                              AS students,
            COUNT(DISTINCT v.student_id)::int                                              AS applied,
            COUNT(DISTINCT v.student_id) FILTER (WHERE v.status IN ('OFFERED', 'HIRED'))::int AS placed,
            (SELECT ROUND(AVG(s2.cgpa), 2) FROM students s2 WHERE s2.branch = s.branch)    AS avg_cgpa,
            ROUND(100.0 * COUNT(DISTINCT v.student_id) FILTER (WHERE v.status IN ('OFFERED', 'HIRED'))
                  / COUNT(DISTINCT s.student_id), 1)                                       AS placement_pct
     FROM students s
     LEFT JOIN vw_application_overview v ON v.student_id = s.student_id
     GROUP BY s.branch
     ORDER BY placement_pct DESC, students DESC, s.branch`,
  );
  return rows.map((row) => ({ ...row, avg_cgpa: Number(row.avg_cgpa), placement_pct: Number(row.placement_pct) }));
}

// How many applications are in each status, in the process order
// APPLIED, SHORTLISTED, ... HIRED. Ordering by v.status (the ENUM column,
// not the ::text copy) sorts by the order the values were declared in.
export async function getStatusCounts(): Promise<{ status: string; count: number }[]> {
  return query(
    `SELECT v.status::text AS status, COUNT(*)::int AS count
     FROM vw_application_overview v
     GROUP BY v.status
     ORDER BY v.status`,
  );
}

export type CompanyStat = {
  company_id: number;
  company: string;
  industry: string | null;
  jobs: number;
  open_jobs: number;
  applications: number;
  offers: number;
  top_ctc: number | null;
};

// One row per company: jobs, applications received, offers made.
export async function getCompanyStats(): Promise<CompanyStat[]> {
  const rows = await query<Omit<CompanyStat, "top_ctc"> & { top_ctc: string | null }>(
    `SELECT c.company_id, c.name AS company, c.industry,
            COUNT(DISTINCT j.job_id)::int                                          AS jobs,
            COUNT(DISTINCT j.job_id) FILTER (WHERE j.status = 'OPEN')::int         AS open_jobs,
            COUNT(a.application_id)::int                                           AS applications,
            COUNT(a.application_id) FILTER (WHERE a.status IN ('OFFERED', 'HIRED'))::int AS offers,
            MAX(j.ctc)                                                             AS top_ctc
     FROM companies c
     LEFT JOIN job_postings j ON j.company_id = c.company_id
     LEFT JOIN applications a ON a.job_id     = j.job_id
     GROUP BY c.company_id, c.name, c.industry
     ORDER BY applications DESC, c.name`,
  );
  return rows.map((row) => ({ ...row, top_ctc: num(row.top_ctc) }));
}

export type ApplicationFilters = {
  q?: string; // student name / USN / job title
  companyId?: number;
  branch?: string;
  status?: string;
  sort?: "recent" | "match";
};

export type ApplicationRow = {
  application_id: number;
  status: string;
  match_score: number | null;
  applied_at: string;
  student_name: string;
  usn: string;
  branch: string;
  cgpa: string;
  job_title: string;
  company_id: number;
  company_name: string;
  ctc: number | null;
  rounds_passed: number;
  total_rounds: number;
  reviewed_by_email: string | null;
};

// Every application on campus, read from the view, with optional filters.
// Filters are fixed SQL fragments with $n parameters (safe from injection).
export async function searchApplications(filters: ApplicationFilters): Promise<ApplicationRow[]> {
  const params: unknown[] = [];
  const param = (value: unknown) => {
    params.push(value);
    return `$${params.length}`;
  };
  const where: string[] = [];
  if (filters.q) {
    const p = param(`%${filters.q.replace(/[\\%_]/g, (ch) => `\\${ch}`)}%`);
    where.push(`(student_name ILIKE ${p} OR usn ILIKE ${p} OR job_title ILIKE ${p})`);
  }
  if (filters.companyId) where.push(`company_id = ${param(filters.companyId)}`);
  if (filters.branch) where.push(`branch = ${param(filters.branch)}`);
  if (filters.status) where.push(`status::text = ${param(filters.status)}`);
  const orderBy = filters.sort === "match" ? "match_score DESC NULLS LAST, applied_at DESC" : "applied_at DESC";

  const rows = await query<
    Omit<ApplicationRow, "match_score" | "ctc" | "rounds_passed" | "total_rounds"> & {
      match_score: string | null;
      ctc: string | null;
      rounds_passed: string;
      total_rounds: string;
    }
  >(
    `SELECT application_id, status::text AS status, match_score, applied_at,
            student_name, usn, branch, cgpa, job_title, company_id, company_name, ctc,
            rounds_passed, total_rounds, reviewed_by_email
     FROM vw_application_overview
     ${where.length ? `WHERE ${where.join(" AND ")}` : ""}
     ORDER BY ${orderBy}
     LIMIT 500`,
    params,
  );
  return rows.map((row) => ({
    ...row,
    match_score: num(row.match_score),
    ctc: num(row.ctc),
    rounds_passed: Number(row.rounds_passed),
    total_rounds: Number(row.total_rounds),
  }));
}

export type StudentFilter = "all" | "placed" | "not_placed" | "not_applied";

export type StudentRow = {
  student_id: number;
  usn: string;
  full_name: string;
  branch: string;
  cgpa: string;
  grad_year: number | null;
  has_resume: boolean;
  applications: number;
  shortlisted: number;
  offers: number;
};

// Students with their application counts. The placed / not placed / not
// applied filters are HAVING conditions: they filter on the aggregated
// counts, which WHERE cannot do.
export async function searchStudents(filters: { q?: string; branch?: string; show?: StudentFilter }): Promise<StudentRow[]> {
  const params: unknown[] = [];
  const param = (value: unknown) => {
    params.push(value);
    return `$${params.length}`;
  };
  const where: string[] = [];
  if (filters.q) {
    const p = param(`%${filters.q.replace(/[\\%_]/g, (ch) => `\\${ch}`)}%`);
    where.push(`(s.full_name ILIKE ${p} OR s.usn ILIKE ${p})`);
  }
  if (filters.branch) where.push(`s.branch = ${param(filters.branch)}`);

  const placed = `COUNT(a.application_id) FILTER (WHERE a.status IN ('OFFERED', 'HIRED'))`;
  const having = {
    all: "",
    placed: `HAVING ${placed} > 0`,
    not_placed: `HAVING ${placed} = 0`,
    not_applied: `HAVING COUNT(a.application_id) = 0`,
  }[filters.show ?? "all"];

  return query<StudentRow>(
    `SELECT s.student_id, s.usn, s.full_name, s.branch, s.cgpa, s.grad_year,
            (s.resume_text IS NOT NULL AND btrim(s.resume_text) <> '')            AS has_resume,
            COUNT(a.application_id)::int                                          AS applications,
            COUNT(a.application_id) FILTER (WHERE a.status = 'SHORTLISTED')::int  AS shortlisted,
            ${placed}::int                                                        AS offers
     FROM students s
     LEFT JOIN applications a ON a.student_id = s.student_id
     ${where.length ? `WHERE ${where.join(" AND ")}` : ""}
     GROUP BY s.student_id
     ${having}
     ORDER BY s.full_name`,
    params,
  );
}

export async function companyOptions(): Promise<{ company_id: number; name: string }[]> {
  return query(`SELECT company_id, name FROM companies ORDER BY name`);
}
