import Link from "next/link";
import JobCard from "@/components/student/JobCard";
import { requireStudent } from "@/lib/auth";
import { query } from "@/lib/db";
import { STATUS_STYLE } from "@/lib/format";
import { searchJobs } from "@/lib/jobs";

type Profile = {
  full_name: string;
  usn: string;
  branch: string;
  cgpa: string;
  grad_year: number | null;
  has_resume: boolean;
};

// Student dashboard: profile, applications by status (GROUP BY), and the
// top 3 recommended jobs from the vector search.
export default async function StudentDashboard() {
  const { studentId } = await requireStudent();

  const [[profile], statusCounts, topJobs] = await Promise.all([
    query<Profile>(
      `SELECT full_name, usn, branch, cgpa, grad_year,
              (resume_text IS NOT NULL AND btrim(resume_text) <> '') AS has_resume
       FROM students WHERE student_id = $1`,
      [studentId],
    ),
    query<{ status: string; count: number }>(
      `SELECT status::text AS status, COUNT(*)::int AS count
       FROM applications WHERE student_id = $1
       GROUP BY status ORDER BY count DESC`,
      [studentId],
    ),
    searchJobs(studentId, { mode: "recommended", limit: 3 }),
  ]);
  const totalApplications = statusCounts.reduce((sum, row) => sum + row.count, 0);

  return (
    <main className="space-y-6">
      <h1 className="text-3xl font-bold tracking-tight">Welcome, {profile.full_name}</h1>

      <section className="card grid grid-cols-2 gap-4 sm:grid-cols-5">
        <Info label="USN" value={profile.usn} />
        <Info label="Branch" value={profile.branch} />
        <Info label="CGPA" value={profile.cgpa} />
        <Info label="Graduating" value={profile.grad_year ?? "—"} />
        <Info label="Applications" value={totalApplications} />
      </section>

      {!profile.has_resume && (
        <p className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm">
          You haven&apos;t written your resume yet, so your matches are based only on your skills list.{" "}
          <Link href="/student/resume" className="font-medium underline">Add your resume →</Link>
        </p>
      )}

      {statusCounts.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-lg font-semibold">My applications</h2>
          <div className="flex flex-wrap gap-2">
            {statusCounts.map((row) => (
              <span key={row.status} className={`rounded-full px-3 py-1 text-sm font-medium ${STATUS_STYLE[row.status]}`}>
                {row.status}: {row.count}
              </span>
            ))}
            <Link href="/student/applications" className="px-2 py-1 text-sm underline">View all →</Link>
          </div>
        </section>
      )}

      <section className="space-y-3">
        <div className="flex items-baseline justify-between">
          <h2 className="text-lg font-semibold">Top matches for your resume</h2>
          <Link href="/student/recommended" className="text-sm underline">See all →</Link>
        </div>
        {topJobs.length === 0 ? (
          <p className="opacity-70">No open jobs right now.</p>
        ) : (
          topJobs.map((job) => <JobCard key={job.job_id} job={job} similarityLabel="Resume fit" />)
        )}
      </section>
    </main>
  );
}

function Info({ label, value }: { label: string; value: string | number }) {
  return (
    <div>
      <p className="text-sm opacity-70">{label}</p>
      <p className="text-lg font-semibold">{value}</p>
    </div>
  );
}
