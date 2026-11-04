import Link from "next/link";
import { companyText, formatCtc, formatPercent, formatShortDate } from "@/lib/format";
import type { JobListing } from "@/lib/jobs";
import ApplyButton from "./ApplyButton";

// Why a student is not eligible, in plain words (same rules as the trigger).
export function ineligibilityReasons(job: Pick<JobListing, "cgpa_ok" | "branch_ok" | "deadline_ok" | "min_cgpa">) {
  const reasons: string[] = [];
  if (!job.cgpa_ok) reasons.push(`needs CGPA ${job.min_cgpa?.toFixed(2)}+`);
  if (!job.branch_ok) reasons.push("branch not eligible");
  if (!job.deadline_ok) reasons.push("deadline passed");
  return reasons;
}

// A thin bar showing a 0–1 score, with the number in the data font.
export function ScoreBar({ label, value }: { label: string; value: number | null }) {
  if (value === null) return null;
  const percent = Math.max(0, Math.min(100, Math.round(value * 100)));
  return (
    <div className="space-y-1.5">
      <div className="flex items-baseline justify-between gap-3 text-sm">
        <span className="text-muted">{label}</span>
        <span className="font-mono font-bold">{formatPercent(value)}</span>
      </div>
      <div className="h-1 rounded-full bg-line">
        <div className="h-1 rounded-full bg-primary-strong" style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}

// One job as a row inside a list card: coloured company label, title, data
// chips (pay, place, deadline, scores, eligibility), and Apply on the right.
// Place inside <ul className="card divide-y divide-line p-0">.
export default function JobRow({
  job,
  scoreLabel,
}: {
  job: JobListing;
  scoreLabel?: string; // name for job.similarity, e.g. "fit" or "relevance"
}) {
  const reasons = ineligibilityReasons(job);

  return (
    <li className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0 space-y-2">
        <p className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
          <span className={`text-[13px] font-medium ${companyText(job.company_id)}`}>{job.company}</span>
          <Link href={`/student/jobs/${job.job_id}`} className="text-[15px] font-medium text-foreground hover:underline">
            {job.title}
          </Link>
        </p>
        <div className="flex flex-wrap gap-1.5">
          <span className="chip chip-gray">{formatCtc(job.ctc)}</span>
          <span className="chip chip-gray">{job.location ?? "anywhere"}</span>
          <span className="chip chip-gray">apply by {formatShortDate(job.deadline)}</span>
          {scoreLabel && job.similarity !== null && (
            <span className="chip chip-blue">
              {scoreLabel} {formatPercent(job.similarity)}
            </span>
          )}
          {job.match_score !== null && <span className="chip chip-blue">match {formatPercent(job.match_score)}</span>}
          {!job.already_applied &&
            reasons.map((reason) => (
              <span key={reason} className="chip chip-red">
                {reason}
              </span>
            ))}
        </div>
      </div>

      <div className="shrink-0">
        {job.already_applied ? (
          <span className="chip chip-green">✓ applied</span>
        ) : job.eligible ? (
          <ApplyButton jobId={job.job_id} />
        ) : null}
      </div>
    </li>
  );
}
