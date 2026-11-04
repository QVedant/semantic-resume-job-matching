import Link from "next/link";
import { notFound } from "next/navigation";
import ApplicantActions from "@/components/recruiter/ApplicantActions";
import JobStatusButton from "@/components/recruiter/JobStatusButton";
import EmptyState from "@/components/ui/EmptyState";
import PageHeader from "@/components/ui/PageHeader";
import { formatCtc, formatPercent, formatShortDate, JOB_STATUS_STYLE, paragraphs, STATUS_STYLE } from "@/lib/format";
import { getJobWithApplicants, parseId, requireRecruiter } from "@/lib/recruiter";
import { currentRound } from "@/lib/rounds";

type Props = { params: Promise<{ id: string }> };

const ROUND_CHIP: Record<string, string> = {
  PASSED: "chip chip-green",
  PENDING: "chip chip-amber",
  REJECTED: "chip chip-red",
};

// One of the recruiter's jobs, with its applicants ranked by semantic match score.
export default async function RecruiterJobPage({ params }: Props) {
  const { recruiterId } = await requireRecruiter();
  const jobId = parseId((await params).id);
  if (!jobId) notFound();

  const job = await getJobWithApplicants(recruiterId, jobId);
  if (!job) notFound(); // not found, or posted by someone else

  return (
    <main>
      <Link href="/recruiter/jobs" className="link text-sm">
        My jobs
      </Link>

      <PageHeader
        title={job.title}
        description={
          <span className="inline-flex flex-wrap items-center gap-1.5 align-middle">
            <span className={JOB_STATUS_STYLE[job.status]}>{job.status.toLowerCase()}</span>
            <span className="chip chip-gray">{job.location ?? "anywhere"}</span>
            <span className="chip chip-gray">{formatCtc(job.ctc)}</span>
            <span className="chip chip-gray">cgpa {job.min_cgpa ?? "—"}+</span>
            <span className="chip chip-gray">{job.eligible_branches}</span>
            <span className="chip chip-gray">apply by {formatShortDate(job.deadline)}</span>
          </span>
        }
        actions={<JobStatusButton jobId={job.job_id} status={job.status} />}
      />

      <p className="mb-4 text-[15px] text-muted">
        <strong className="font-semibold text-foreground">{job.applicants.length}</strong> applicants, ranked by match
        score: 80% how closely the resume matches this job&apos;s meaning, 20% CGPA.
      </p>

      {job.applicants.length === 0 ? (
        <EmptyState title="No applications yet">
          Students who apply appear here, ranked by how well their resume matches this job.
        </EmptyState>
      ) : (
        <ol className="space-y-4">
          {job.applicants.map((applicant) => {
            const upNext = currentRound(applicant.rounds)?.round_no;
            return (
              <li key={applicant.application_id} className="card space-y-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex items-start gap-4">
                    <span className="font-display text-4xl leading-none text-accent-ink italic">#{applicant.rank}</span>
                    <div className="space-y-1.5">
                      <p className="text-[17px] font-medium">{applicant.full_name}</p>
                      <div className="flex flex-wrap gap-1.5">
                        <span className="chip chip-gray">{applicant.usn}</span>
                        <span className="chip chip-gray">{applicant.branch}</span>
                        <span className="chip chip-gray">cgpa {applicant.cgpa}</span>
                        <span className="chip chip-gray">applied {formatShortDate(applicant.applied_at)}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1.5">
                    <span className="font-mono text-2xl font-bold">{formatPercent(applicant.match_score)}</span>
                    <span className={STATUS_STYLE[applicant.status]}>{applicant.status.toLowerCase()}</span>
                  </div>
                </div>

                {applicant.skills && <p className="text-sm text-muted">Skills: {applicant.skills}</p>}

                {applicant.resume_text && (
                  <details className="text-sm">
                    <summary className="link cursor-pointer">Show resume</summary>
                    <div className="mt-2 max-w-prose space-y-2 leading-relaxed">
                      {paragraphs(applicant.resume_text).map((text) => (
                        <p key={text}>{text}</p>
                      ))}
                    </div>
                  </details>
                )}

                {applicant.rounds.length > 0 && (
                  <ol className="flex flex-wrap items-center gap-1.5" aria-label="Interview rounds">
                    {applicant.rounds.map((round) => (
                      <li key={round.round_id} className="flex items-center gap-1.5">
                        <span
                          className={
                            round.result
                              ? ROUND_CHIP[round.result]
                              : round.round_no === upNext
                                ? "chip chip-blue"
                                : "chip chip-gray opacity-70"
                          }
                        >
                          {round.round_no}. {round.round_name.toLowerCase()} ·{" "}
                          {round.result?.toLowerCase() ?? (round.round_no === upNext ? "up next" : "not reached")}
                        </span>
                        {round.feedback && <span className="text-xs text-muted">“{round.feedback}”</span>}
                      </li>
                    ))}
                  </ol>
                )}

                <ApplicantActions applicant={applicant} />
              </li>
            );
          })}
        </ol>
      )}
    </main>
  );
}
