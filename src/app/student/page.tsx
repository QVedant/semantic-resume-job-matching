import Link from "next/link";
import JobRow from "@/components/student/JobCard";
import PageHeader from "@/components/ui/PageHeader";
import { getStudentApplications } from "@/lib/applications";
import { requireStudent } from "@/lib/auth";
import { query } from "@/lib/db";
import { companyText, formatPercent, STATUS_STYLE } from "@/lib/format";
import { searchJobs } from "@/lib/jobs";

type Profile = {
  full_name: string;
  usn: string;
  branch: string;
  cgpa: string;
  grad_year: number | null;
  has_resume: boolean;
};

// Student dashboard: best matches (vector search), latest applications and
// the profile, with the totals in the summary line.
export default async function StudentDashboard() {
  const { studentId } = await requireStudent();

  const [[profile], applications, topJobs] = await Promise.all([
    query<Profile>(
      `SELECT full_name, usn, branch, cgpa, grad_year,
              (resume_text IS NOT NULL AND btrim(resume_text) <> '') AS has_resume
       FROM students WHERE student_id = $1`,
      [studentId],
    ),
    getStudentApplications(studentId),
    searchJobs(studentId, { mode: "recommended", limit: 4 }),
  ]);
  const count = (...statuses: string[]) => applications.filter((a) => statuses.includes(a.status)).length;

  return (
    <main>
      <PageHeader
        title="Welcome,"
        accent={profile.full_name.split(" ")[0]}
        description={
          <>
            <strong>{applications.length}</strong> applications · <strong>{count("SHORTLISTED")}</strong> shortlisted ·{" "}
            <strong>{count("OFFERED", "HIRED")}</strong> offers
          </>
        }
      />

      {!profile.has_resume && (
        <p className="alert-warning mb-5">
          You haven&apos;t written your resume yet, so these matches use only your skills list.{" "}
          <Link href="/student/resume" className="link">
            Write your resume
          </Link>
        </p>
      )}

      <div className="grid items-start gap-5 lg:grid-cols-[1fr_320px]">
        <section className="card overflow-hidden p-0">
          <div className="flex items-baseline justify-between px-5 pt-4 pb-1">
            <h2 className="section-label">Best matches for your resume</h2>
            <Link href="/student/recommended" className="link text-sm">
              See all
            </Link>
          </div>
          {topJobs.length === 0 ? (
            <p className="px-5 py-6 text-sm text-muted">No open jobs right now. New jobs appear here as soon as they are published.</p>
          ) : (
            <ul className="divide-y divide-line">
              {topJobs.map((job) => (
                <JobRow key={job.job_id} job={job} scoreLabel="fit" />
              ))}
            </ul>
          )}
        </section>

        <div className="space-y-5">
          <section className="card overflow-hidden p-0">
            <div className="flex items-baseline justify-between px-5 pt-4 pb-1">
              <h2 className="section-label">My applications</h2>
              <Link href="/student/applications" className="link text-sm">
                See all
              </Link>
            </div>
            {applications.length === 0 ? (
              <p className="px-5 py-4 text-sm text-muted">Nothing yet. Apply from your best matches.</p>
            ) : (
              <ul className="divide-y divide-line">
                {applications.slice(0, 5).map((app) => (
                  <li key={app.application_id} className="space-y-1.5 px-5 py-3">
                    <p className="flex flex-wrap items-baseline gap-x-2">
                      <span className={`text-[13px] font-medium ${companyText(app.company_id)}`}>{app.company_name}</span>
                      <span className="text-[15px]">{app.job_title}</span>
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      <span className={STATUS_STYLE[app.status]}>{app.status.toLowerCase()}</span>
                      <span className="chip chip-gray">match {formatPercent(app.match_score)}</span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="card space-y-3">
            <h2 className="section-label">Profile</h2>
            <dl className="space-y-2 text-sm">
              <Fact label="USN" value={profile.usn} mono />
              <Fact label="Branch" value={profile.branch} />
              <Fact label="CGPA" value={profile.cgpa} mono />
              <Fact label="Graduating" value={String(profile.grad_year ?? "—")} mono />
            </dl>
            <Link href="/student/resume" className="link text-sm">
              {profile.has_resume ? "Edit resume" : "Write your resume"}
            </Link>
          </section>
        </div>
      </div>
    </main>
  );
}

function Fact({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className="text-muted">{label}</dt>
      <dd className={mono ? "font-mono font-bold" : "font-medium"}>{value}</dd>
    </div>
  );
}
