import Link from "next/link";
import JobStatusButton from "@/components/recruiter/JobStatusButton";
import EmptyState from "@/components/ui/EmptyState";
import PageHeader from "@/components/ui/PageHeader";
import { formatCtc, formatShortDate, JOB_STATUS_STYLE } from "@/lib/format";
import { getRecruiterJobs, requireRecruiter } from "@/lib/recruiter";

// The recruiter's jobs with applicant counts (GROUP BY + COUNT FILTER).
export default async function RecruiterJobsPage() {
  const { recruiterId } = await requireRecruiter();
  const jobs = await getRecruiterJobs(recruiterId);
  const open = jobs.filter((job) => job.status === "OPEN").length;

  return (
    <main>
      <PageHeader
        title="My"
        accent="jobs"
        description={
          <>
            <strong>{open}</strong> open · <strong>{jobs.length - open}</strong> draft or closed
          </>
        }
        actions={
          <Link href="/recruiter/jobs/new" className="btn-primary">
            Post a job
          </Link>
        }
      />

      {jobs.length === 0 ? (
        <EmptyState title="You haven't posted any jobs yet">
          <Link href="/recruiter/jobs/new" className="link">
            Post your first job
          </Link>
        </EmptyState>
      ) : (
        <div className="card overflow-x-auto p-0">
          <table className="w-full text-left text-sm">
            <thead className="table-head">
              <tr>
                <th className="px-5 py-3 font-semibold">Job</th>
                <th className="px-3 py-3 font-semibold">Status</th>
                <th className="px-3 py-3 text-right font-semibold">Applied</th>
                <th className="px-3 py-3 text-right font-semibold">To review</th>
                <th className="px-3 py-3 text-right font-semibold">Shortlisted</th>
                <th className="px-3 py-3 text-right font-semibold">Offers</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {jobs.map((job) => (
                <tr key={job.job_id} className="transition hover:bg-surface-muted">
                  <td className="px-5 py-3.5">
                    <Link href={`/recruiter/jobs/${job.job_id}`} className="text-[15px] font-medium hover:underline">
                      {job.title}
                    </Link>
                    <div className="mt-1.5 flex flex-wrap gap-1.5">
                      <span className="chip chip-gray">{job.location ?? "anywhere"}</span>
                      <span className="chip chip-gray">{formatCtc(job.ctc)}</span>
                      <span className="chip chip-gray">apply by {formatShortDate(job.deadline)}</span>
                    </div>
                  </td>
                  <td className="px-3 py-3.5">
                    <span className={JOB_STATUS_STYLE[job.status]}>{job.status.toLowerCase()}</span>
                  </td>
                  <td className="px-3 py-3.5 text-right font-mono font-bold">{job.applicants}</td>
                  <td className="px-3 py-3.5 text-right font-mono font-bold">{job.to_review}</td>
                  <td className="px-3 py-3.5 text-right font-mono font-bold">{job.shortlisted}</td>
                  <td className="px-3 py-3.5 text-right font-mono font-bold">{job.offers}</td>
                  <td className="px-5 py-3.5 text-right">
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
