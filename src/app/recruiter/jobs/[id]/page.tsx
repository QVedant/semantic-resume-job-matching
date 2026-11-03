import Link from "next/link";
import { notFound } from "next/navigation";
import ApplicantActions from "@/components/recruiter/ApplicantActions";
import JobStatusButton from "@/components/recruiter/JobStatusButton";
import { formatCtc, formatDate, formatPercent, STATUS_STYLE } from "@/lib/format";
import { getJobWithApplicants, parseId, requireRecruiter } from "@/lib/recruiter";
import { currentRound } from "@/lib/rounds";

type Props = { params: Promise<{ id: string }> };

const RESULT_STYLE: Record<string, string> = {
  PASSED: "text-green-700 dark:text-green-400",
  PENDING: "text-amber-700 dark:text-amber-300",
  REJECTED: "text-red-600 dark:text-red-400",
};

// One of the recruiter's jobs, with its applicants ranked by semantic match score.
export default async function RecruiterJobPage({ params }: Props) {
  const { recruiterId } = await requireRecruiter();
  const jobId = parseId((await params).id);
  if (!jobId) notFound();

  const job = await getJobWithApplicants(recruiterId, jobId);
  if (!job) notFound(); // not found, or posted by someone else

  return (
    <main className="space-y-6">
      <Link href="/recruiter/jobs" className="text-sm underline">← My jobs</Link>

      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight">{job.title}</h1>
          <p className="opacity-80">
            {job.location} · {formatCtc(job.ctc)} · Min CGPA {job.min_cgpa ?? "—"} · {job.eligible_branches} · Apply by{" "}
            {formatDate(job.deadline)}
          </p>
          <p className="text-sm">
            Status: <strong>{job.status}</strong>
          </p>
        </div>
        <JobStatusButton jobId={job.job_id} status={job.status} />
      </header>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">
          Applicants ({job.applicants.length}), ranked by match score
        </h2>
        <p className="text-sm opacity-70">
          Match score = 80% semantic similarity between the resume and this job description + 20% CGPA.
        </p>

        {job.applicants.length === 0 ? (
          <p className="opacity-70">No applications yet.</p>
        ) : (
          job.applicants.map((applicant) => (
            <article key={applicant.application_id} className="card space-y-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex items-start gap-4">
                  <span className="text-3xl font-bold opacity-30">#{applicant.rank}</span>
                  <div>
                    <p className="text-lg font-semibold">{applicant.full_name}</p>
                    <p className="text-sm opacity-80">
                      {applicant.usn} · {applicant.branch} · CGPA {applicant.cgpa} · applied {formatDate(applicant.applied_at)}
                    </p>
                    {applicant.skills && <p className="text-xs opacity-60">Skills: {applicant.skills}</p>}
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <span className="text-2xl font-semibold">{formatPercent(applicant.match_score)}</span>
                  <span className={`rounded-full px-3 py-1 text-sm font-medium ${STATUS_STYLE[applicant.status]}`}>
                    {applicant.status}
                  </span>
                </div>
              </div>

              {applicant.resume_text && (
                <details className="text-sm">
                  <summary className="cursor-pointer font-medium">Resume</summary>
                  <p className="mt-2 whitespace-pre-line leading-relaxed opacity-90">{applicant.resume_text.trim()}</p>
                </details>
              )}

              {applicant.rounds.length > 0 && (
                <ol className="flex flex-wrap gap-2 text-sm">
                  {applicant.rounds.map((round) => (
                    <li key={round.round_id} className="rounded-lg border border-black/10 px-3 py-1.5 dark:border-white/15">
                      {round.round_no}. {round.round_name}:{" "}
                      <span className={round.result ? RESULT_STYLE[round.result] : "opacity-50"}>
                        {round.result ??
                          (round.round_no === currentRound(applicant.rounds)?.round_no ? "up next" : "not reached")}
                      </span>
                      {round.feedback && <span className="opacity-60"> · “{round.feedback}”</span>}
                    </li>
                  ))}
                </ol>
              )}

              <ApplicantActions applicant={applicant} />
            </article>
          ))
        )}
      </section>
    </main>
  );
}
