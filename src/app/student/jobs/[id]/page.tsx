import Link from "next/link";
import { notFound } from "next/navigation";
import ApplyButton from "@/components/student/ApplyButton";
import { ScoreBar } from "@/components/student/JobCard";
import { requireStudent } from "@/lib/auth";
import { formatCtc, formatDate, STATUS_STYLE } from "@/lib/format";
import { getJobDetail } from "@/lib/jobs";

type Props = { params: Promise<{ id: string }> };

// One job in full: description, eligibility checklist, match score, required
// skills (which ones the student has or is missing), interview rounds, and Apply.
export default async function JobDetailPage({ params }: Props) {
  const { studentId } = await requireStudent();
  const jobId = Number((await params).id);
  if (!Number.isInteger(jobId)) notFound();

  const job = await getJobDetail(studentId, jobId);
  if (!job) notFound();

  const checks = [
    { ok: job.status === "OPEN", text: `Job is open (status: ${job.status})` },
    { ok: job.deadline_ok, text: `Deadline ${formatDate(job.deadline)} has not passed` },
    { ok: job.cgpa_ok, text: `Your CGPA meets the minimum of ${job.min_cgpa?.toFixed(2) ?? "—"}` },
    { ok: job.branch_ok, text: `Your branch is in: ${job.eligible_branches ?? "all branches"}` },
  ];

  return (
    <main className="space-y-6">
      <Link href="/student/jobs" className="text-sm underline">← All jobs</Link>

      <header className="space-y-1">
        <h1 className="text-3xl font-bold tracking-tight">{job.title}</h1>
        <p className="opacity-80">
          {job.company}
          {job.industry ? ` · ${job.industry}` : ""} · {job.location ?? "Location not set"} · {formatCtc(job.ctc)}
        </p>
      </header>

      <div className="grid gap-6 lg:grid-cols-3">
        <section className="space-y-6 lg:col-span-2">
          <div className="card space-y-2">
            <h2 className="font-semibold">About the role</h2>
            <p className="whitespace-pre-line leading-relaxed opacity-90">
              {job.description?.trim() || "No description provided."}
            </p>
          </div>

          <div className="card space-y-3">
            <h2 className="font-semibold">Required skills</h2>
            <ul className="space-y-2">
              {job.skills.map((skill) => (
                <li key={skill.name} className="flex items-center justify-between gap-3 text-sm">
                  <span>
                    {skill.my_level ? "✓" : "✗"} {skill.name}
                    <span className="opacity-60"> · importance {Math.round(skill.weight * 100)}%</span>
                  </span>
                  <span className={skill.my_level ? "text-green-700 dark:text-green-400" : "text-red-600 dark:text-red-400"}>
                    {skill.my_level ? `You: ${skill.my_level.toLowerCase()}` : "Missing"}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          {job.rounds.length > 0 && (
            <div className="card space-y-2">
              <h2 className="font-semibold">Selection process</h2>
              <ol className="list-inside list-decimal space-y-1 text-sm">
                {job.rounds.map((round) => (
                  <li key={round.round_no}>
                    {round.round_name} <span className="opacity-60">({round.round_type.replace(/_/g, " ").toLowerCase()})</span>
                  </li>
                ))}
              </ol>
            </div>
          )}
        </section>

        <aside className="space-y-4">
          <div className="card space-y-4">
            <ScoreBar label="Resume fit" value={job.similarity} />
            <ScoreBar label="Match score" value={job.match_score} />
            <p className="text-xs opacity-60">Match score = 80% resume fit + 20% CGPA.</p>
          </div>

          <div className="card space-y-3">
            <h2 className="font-semibold">Eligibility</h2>
            <ul className="space-y-1 text-sm">
              {checks.map((check) => (
                <li key={check.text} className={check.ok ? "" : "text-red-600 dark:text-red-400"}>
                  {check.ok ? "✓" : "✗"} {check.text}
                </li>
              ))}
            </ul>
            {job.my_status ? (
              <p>
                Your application:{" "}
                <span className={`rounded-full px-3 py-1 text-sm font-medium ${STATUS_STYLE[job.my_status]}`}>
                  {job.my_status}
                </span>
              </p>
            ) : job.status === "OPEN" ? (
              // Shown even when a check fails: the database trigger makes the
              // final decision and explains any refusal.
              <ApplyButton jobId={job.job_id} />
            ) : null}
          </div>
        </aside>
      </div>
    </main>
  );
}
