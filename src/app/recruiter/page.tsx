import Link from "next/link";
import { query } from "@/lib/db";
import { formatPercent } from "@/lib/format";
import { getRecruiterJobs, requireRecruiter } from "@/lib/recruiter";

type Profile = { full_name: string; designation: string | null };
type ToReview = {
  application_id: number;
  job_id: number;
  job_title: string;
  student_name: string;
  branch: string;
  match_score: string | null;
};

// Recruiter dashboard: totals across their jobs, and the best-matching
// applicants still waiting for a decision.
export default async function RecruiterDashboard() {
  const { session, recruiterId, companyName } = await requireRecruiter();

  const [[profile], jobs, toReview] = await Promise.all([
    query<Profile>(`SELECT full_name, designation FROM recruiters WHERE user_id = $1`, [session.userId]),
    getRecruiterJobs(recruiterId),
    query<ToReview>(
      `SELECT a.application_id, j.job_id, j.title AS job_title, s.full_name AS student_name, s.branch, a.match_score
       FROM applications a
       JOIN job_postings j ON j.job_id = a.job_id
       JOIN students     s ON s.student_id = a.student_id
       WHERE j.posted_by = $1 AND a.status = 'APPLIED'
       ORDER BY a.match_score DESC NULLS LAST
       LIMIT 5`,
      [recruiterId],
    ),
  ]);

  const total = (key: "applicants" | "to_review" | "shortlisted" | "offers") =>
    jobs.reduce((sum, job) => sum + job[key], 0);

  return (
    <main className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Welcome, {profile.full_name}</h1>
        <p className="opacity-70">
          {profile.designation ? `${profile.designation} · ` : ""}
          {companyName}
        </p>
      </div>

      <section className="card grid grid-cols-2 gap-4 sm:grid-cols-5">
        <Info label="Open jobs" value={jobs.filter((job) => job.status === "OPEN").length} />
        <Info label="Applicants" value={total("applicants")} />
        <Info label="To review" value={total("to_review")} />
        <Info label="Shortlisted" value={total("shortlisted")} />
        <Info label="Offers" value={total("offers")} />
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Best-matching applicants waiting for review</h2>
        {toReview.length === 0 ? (
          <p className="opacity-70">Nobody is waiting for a decision.</p>
        ) : (
          <ul className="card divide-y divide-black/10 p-0 dark:divide-white/15">
            {toReview.map((row) => (
              <li key={row.application_id} className="flex flex-wrap items-center justify-between gap-2 px-6 py-3">
                <span>
                  <strong>{row.student_name}</strong> <span className="opacity-60">({row.branch})</span> applied to{" "}
                  <Link href={`/recruiter/jobs/${row.job_id}`} className="underline">{row.job_title}</Link>
                </span>
                <span className="text-sm font-semibold">Match {formatPercent(row.match_score)}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <Link href="/recruiter/jobs/new" className="btn-primary">Post a new job</Link>
    </main>
  );
}

function Info({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <p className="text-sm opacity-70">{label}</p>
      <p className="text-2xl font-semibold">{value}</p>
    </div>
  );
}
