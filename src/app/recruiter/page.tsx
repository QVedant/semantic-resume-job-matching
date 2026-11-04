import Link from "next/link";
import PageHeader from "@/components/ui/PageHeader";
import { query } from "@/lib/db";
import { formatPercent, JOB_STATUS_STYLE } from "@/lib/format";
import { getRecruiterJobs, requireRecruiter } from "@/lib/recruiter";

type Profile = { full_name: string; designation: string | null };
type ToReview = {
  application_id: number;
  job_id: number;
  job_title: string;
  student_name: string;
  branch: string;
  cgpa: string;
  match_score: string | null;
};

// Recruiter dashboard: the best-matching applicants still waiting for a
// decision, and the recruiter's jobs with their applicant counts.
export default async function RecruiterDashboard() {
  const { session, recruiterId, companyName } = await requireRecruiter();

  const [[profile], jobs, toReview] = await Promise.all([
    query<Profile>(`SELECT full_name, designation FROM recruiters WHERE user_id = $1`, [session.userId]),
    getRecruiterJobs(recruiterId),
    query<ToReview>(
      `SELECT a.application_id, j.job_id, j.title AS job_title, s.full_name AS student_name, s.branch, s.cgpa, a.match_score
       FROM applications a
       JOIN job_postings j ON j.job_id = a.job_id
       JOIN students     s ON s.student_id = a.student_id
       WHERE j.posted_by = $1 AND a.status = 'APPLIED'
       ORDER BY a.match_score DESC NULLS LAST
       LIMIT 6`,
      [recruiterId],
    ),
  ]);

  const total = (key: "applicants" | "to_review" | "shortlisted" | "offers") =>
    jobs.reduce((sum, job) => sum + job[key], 0);

  return (
    <main>
      <PageHeader
        title="Welcome,"
        accent={profile.full_name.split(" ")[0]}
        description={
          <>
            {profile.designation ? `${profile.designation}, ` : ""}
            {companyName} · <strong>{jobs.filter((job) => job.status === "OPEN").length}</strong> open jobs ·{" "}
            <strong>{total("to_review")}</strong> waiting for review · <strong>{total("offers")}</strong> offers made
          </>
        }
        actions={
          <Link href="/recruiter/jobs/new" className="btn-primary">
            Post a job
          </Link>
        }
      />

      <div className="grid items-start gap-5 lg:grid-cols-[1fr_360px]">
        <section className="card overflow-hidden p-0">
          <h2 className="section-label px-5 pt-4 pb-1">Waiting for review, best match first</h2>
          {toReview.length === 0 ? (
            <p className="px-5 py-5 text-sm text-muted">Nobody is waiting for a decision.</p>
          ) : (
            <ul className="divide-y divide-line">
              {toReview.map((row) => (
                <li key={row.application_id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5">
                  <div className="space-y-1.5">
                    <p className="text-[15px] font-medium">{row.student_name}</p>
                    <div className="flex flex-wrap gap-1.5">
                      <span className="chip chip-gray">{row.branch}</span>
                      <span className="chip chip-gray">cgpa {row.cgpa}</span>
                      <span className="chip chip-blue">match {formatPercent(row.match_score)}</span>
                    </div>
                  </div>
                  <Link href={`/recruiter/jobs/${row.job_id}`} className="text-sm text-muted hover:text-foreground">
                    for <span className="link">{row.job_title}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="card overflow-hidden p-0">
          <div className="flex items-baseline justify-between px-5 pt-4 pb-1">
            <h2 className="section-label">Your jobs</h2>
            <Link href="/recruiter/jobs" className="link text-sm">
              See all
            </Link>
          </div>
          {jobs.length === 0 ? (
            <p className="px-5 py-5 text-sm text-muted">You haven&apos;t posted a job yet.</p>
          ) : (
            <ul className="divide-y divide-line">
              {jobs.slice(0, 6).map((job) => (
                <li key={job.job_id} className="space-y-1.5 px-5 py-3">
                  <Link href={`/recruiter/jobs/${job.job_id}`} className="text-[15px] font-medium hover:underline">
                    {job.title}
                  </Link>
                  <div className="flex flex-wrap gap-1.5">
                    <span className={JOB_STATUS_STYLE[job.status]}>{job.status.toLowerCase()}</span>
                    <span className="chip chip-gray">{job.applicants} applied</span>
                    {job.to_review > 0 && <span className="chip chip-amber">{job.to_review} to review</span>}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </main>
  );
}
