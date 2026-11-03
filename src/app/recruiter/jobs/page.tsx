import Link from "next/link";
import JobStatusButton from "@/components/recruiter/JobStatusButton";
import { formatCtc, formatDate } from "@/lib/format";
import { getRecruiterJobs, requireRecruiter } from "@/lib/recruiter";

const JOB_STATUS_STYLE: Record<string, string> = {
  OPEN: "bg-green-500/15 text-green-700 dark:text-green-300",
  DRAFT: "bg-gray-500/15 text-gray-700 dark:text-gray-300",
  CLOSED: "bg-red-500/15 text-red-700 dark:text-red-300",
};

// The recruiter's jobs with applicant counts (GROUP BY + COUNT FILTER).
export default async function RecruiterJobsPage() {
  const { recruiterId } = await requireRecruiter();
  const jobs = await getRecruiterJobs(recruiterId);

  return (
    <main className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-3xl font-bold tracking-tight">My jobs</h1>
        <Link href="/recruiter/jobs/new" className="btn-primary">Post a job</Link>
      </div>

      {jobs.length === 0 ? (
        <p className="opacity-70">You haven&apos;t posted any jobs yet.</p>
      ) : (
        <div className="card overflow-x-auto p-0">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-black/10 text-xs uppercase opacity-70 dark:border-white/15">
              <tr>
                <th className="px-4 py-3">Job</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Deadline</th>
                <th className="px-4 py-3 text-right">Applicants</th>
                <th className="px-4 py-3 text-right">To review</th>
                <th className="px-4 py-3 text-right">Shortlisted</th>
                <th className="px-4 py-3 text-right">Offers</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-black/10 dark:divide-white/15">
              {jobs.map((job) => (
                <tr key={job.job_id}>
                  <td className="px-4 py-3">
                    <Link href={`/recruiter/jobs/${job.job_id}`} className="font-medium hover:underline">{job.title}</Link>
                    <p className="text-xs opacity-60">{job.location} · {formatCtc(job.ctc)}</p>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${JOB_STATUS_STYLE[job.status]}`}>{job.status}</span>
                  </td>
                  <td className="px-4 py-3">{formatDate(job.deadline)}</td>
                  <td className="px-4 py-3 text-right">{job.applicants}</td>
                  <td className="px-4 py-3 text-right">{job.to_review}</td>
                  <td className="px-4 py-3 text-right">{job.shortlisted}</td>
                  <td className="px-4 py-3 text-right">{job.offers}</td>
                  <td className="px-4 py-3 text-right">
                    <JobStatusButton jobId={job.job_id} status={job.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
