import Link from "next/link";
import { formatCtc, formatDate, formatPercent } from "@/lib/format";
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

// A coloured bar showing a 0–1 score.
export function ScoreBar({ label, value }: { label: string; value: number | null }) {
  if (value === null) return null;
  const percent = Math.max(0, Math.min(100, Math.round(value * 100)));
  return (
    <div className="min-w-32 space-y-1">
      <div className="flex justify-between text-xs opacity-70">
        <span>{label}</span>
        <span className="font-semibold">{formatPercent(value)}</span>
      </div>
      <div className="h-1.5 rounded-full bg-black/10 dark:bg-white/15">
        <div className="h-1.5 rounded-full bg-blue-600" style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}

// One job in a list: title, company, key facts, match score, eligibility and
// an Apply button (or the reason the student can't apply).
export default function JobCard({
  job,
  similarityLabel,
}: {
  job: JobListing;
  similarityLabel?: string; // e.g. "Relevance to your search"
}) {
  const reasons = ineligibilityReasons(job);

  return (
    <article className="card flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div className="space-y-1">
        <Link href={`/student/jobs/${job.job_id}`} className="text-lg font-semibold hover:underline">
          {job.title}
        </Link>
        <p className="text-sm opacity-80">
          {job.company} · {job.location ?? "Location not set"} · {formatCtc(job.ctc)}
        </p>
        <p className="text-xs opacity-60">
          Min CGPA {job.min_cgpa?.toFixed(2) ?? "—"} · {job.eligible_branches ?? "All branches"} · Apply by{" "}
          {formatDate(job.deadline)}
        </p>
      </div>

      <div className="flex shrink-0 flex-col gap-3 sm:items-end">
        <div className="flex gap-4">
          {similarityLabel && <ScoreBar label={similarityLabel} value={job.similarity} />}
          <ScoreBar label="Match score" value={job.match_score} />
        </div>
        {job.already_applied ? (
          <span className="rounded-full bg-green-500/15 px-3 py-1 text-sm font-medium text-green-700 dark:text-green-300">
            ✓ Applied
          </span>
        ) : job.eligible ? (
          <ApplyButton jobId={job.job_id} />
        ) : (
          <span className="rounded-full bg-red-500/10 px-3 py-1 text-sm text-red-700 dark:text-red-300">
            Not eligible: {reasons.join(", ")}
          </span>
        )}
      </div>
    </article>
  );
}
