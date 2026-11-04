import { Check, X } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import ApplyButton from "@/components/student/ApplyButton";
import { ScoreBar } from "@/components/student/JobCard";
import PageHeader from "@/components/ui/PageHeader";
import { requireStudent } from "@/lib/auth";
import { companyText, formatCtc, formatDate, paragraphs, STATUS_STYLE } from "@/lib/format";
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
    { ok: job.status === "OPEN", text: `Applications are open` },
    { ok: job.deadline_ok, text: `Deadline ${formatDate(job.deadline)} hasn't passed` },
    { ok: job.cgpa_ok, text: `Your CGPA meets the ${job.min_cgpa?.toFixed(2) ?? "—"} minimum` },
    { ok: job.branch_ok, text: `Your branch is eligible (${job.eligible_branches ?? "all"})` },
  ];

  return (
    <main>
      <Link href="/student/jobs" className="link text-sm">
        All jobs
      </Link>

      <PageHeader
        title={job.title}
        description={
          <>
            <span className={`font-medium ${companyText(job.company_id)}`}>{job.company}</span>
            {job.industry ? `, ${job.industry}` : ""} · {job.location ?? "location not set"} · <strong>{formatCtc(job.ctc)}</strong>
          </>
        }
      />

      <div className="grid items-start gap-5 lg:grid-cols-[1fr_320px]">
        <div className="space-y-5">
          <section className="card space-y-3">
            <h2 className="section-label">About the role</h2>
            {paragraphs(job.description).map((text) => (
              <p key={text} className="max-w-prose leading-relaxed">
                {text}
              </p>
            ))}
            {!job.description && <p className="text-muted">No description provided.</p>}
          </section>

          <section className="card overflow-hidden p-0">
            <h2 className="section-label px-5 pt-4 pb-1">Required skills</h2>
            <ul className="divide-y divide-line">
              {job.skills.map((skill) => (
                <li key={skill.name} className="flex items-center justify-between gap-3 px-5 py-3">
                  <span className="flex items-center gap-3">
                    <span
                      className={`grid h-[18px] w-[18px] place-items-center rounded border ${
                        skill.my_level ? "border-success-line bg-success-soft text-success" : "border-line-strong text-muted"
                      }`}
                      aria-hidden
                    >
                      {skill.my_level ? <Check size={12} strokeWidth={3} /> : <X size={12} strokeWidth={3} />}
                    </span>
                    <span>{skill.name}</span>
                    <span className="chip chip-gray">weight {Math.round(skill.weight * 100)}%</span>
                  </span>
                  <span className={skill.my_level ? "chip chip-green" : "chip chip-red"}>
                    {skill.my_level ? `you: ${skill.my_level.toLowerCase()}` : "missing"}
                  </span>
                </li>
              ))}
            </ul>
          </section>

          {job.rounds.length > 0 && (
            <section className="card overflow-hidden p-0">
              <h2 className="section-label px-5 pt-4 pb-1">Selection process</h2>
              <ol className="divide-y divide-line">
                {job.rounds.map((round) => (
                  <li key={round.round_no} className="flex items-baseline gap-3 px-5 py-3">
                    <span className="font-mono text-sm font-bold text-muted">{round.round_no}.</span>
                    <span>{round.round_name}</span>
                    <span className="chip chip-gray">{round.round_type.replace(/_/g, " ").toLowerCase()}</span>
                  </li>
                ))}
              </ol>
            </section>
          )}
        </div>

        <aside className="space-y-5">
          <section className="card space-y-4">
            <h2 className="section-label">How well you fit</h2>
            <ScoreBar label="Resume fit" value={job.similarity} />
            <ScoreBar label="Match score" value={job.match_score} />
            <p className="text-xs text-muted">Match score is 80% resume fit and 20% CGPA.</p>
          </section>

          <section className="card space-y-3">
            <h2 className="section-label">Eligibility</h2>
            <ul className="space-y-2 text-sm">
              {checks.map((check) => (
                <li key={check.text} className="flex items-start gap-2.5">
                  <span
                    className={`mt-0.5 grid h-[18px] w-[18px] shrink-0 place-items-center rounded border ${
                      check.ok ? "border-success-line bg-success-soft text-success" : "border-danger-line bg-danger-soft text-danger"
                    }`}
                    aria-hidden
                  >
                    {check.ok ? <Check size={12} strokeWidth={3} /> : <X size={12} strokeWidth={3} />}
                  </span>
                  <span className={check.ok ? "" : "text-danger"}>{check.text}</span>
                </li>
              ))}
            </ul>
            {job.my_status ? (
              <p className="text-sm">
                Your application: <span className={STATUS_STYLE[job.my_status]}>{job.my_status.toLowerCase()}</span>
              </p>
            ) : job.status === "OPEN" ? (
              // Shown even when a check fails: the database trigger makes the
              // final decision and explains any refusal.
              <ApplyButton jobId={job.job_id} />
            ) : null}
          </section>
        </aside>
      </div>
    </main>
  );
}
