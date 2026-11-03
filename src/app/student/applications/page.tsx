import Link from "next/link";
import WithdrawButton from "@/components/student/WithdrawButton";
import { getStudentApplications } from "@/lib/applications";
import { requireStudent } from "@/lib/auth";
import { formatCtc, formatDate, formatPercent, STATUS_STYLE } from "@/lib/format";

const RESULT_STYLE: Record<string, string> = {
  PASSED: "text-green-700 dark:text-green-400",
  PENDING: "text-amber-700 dark:text-amber-300",
  REJECTED: "text-red-600 dark:text-red-400",
};

// The student's applications with status and interview progress, read from
// the view vw_application_overview.
export default async function MyApplicationsPage() {
  const { studentId } = await requireStudent();
  const applications = await getStudentApplications(studentId);

  return (
    <main className="space-y-5">
      <h1 className="text-3xl font-bold tracking-tight">My applications</h1>

      {applications.length === 0 ? (
        <p className="opacity-70">
          You haven&apos;t applied anywhere yet.{" "}
          <Link href="/student/recommended" className="underline">See jobs recommended for you →</Link>
        </p>
      ) : (
        applications.map((app) => (
          <article key={app.application_id} className="card space-y-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <Link href={`/student/jobs/${app.job_id}`} className="text-lg font-semibold hover:underline">
                  {app.job_title}
                </Link>
                <p className="text-sm opacity-80">
                  {app.company_name} · {app.location ?? "—"} · {formatCtc(app.ctc)}
                </p>
                <p className="text-xs opacity-60">
                  Applied {formatDate(app.applied_at)} · Match {formatPercent(app.match_score)} · Rounds passed{" "}
                  {app.rounds_passed} of {app.total_rounds}
                </p>
              </div>
              <div className="flex flex-col items-end gap-2">
                <span className={`rounded-full px-3 py-1 text-sm font-medium ${STATUS_STYLE[app.status]}`}>
                  {app.status}
                </span>
                {(app.status === "APPLIED" || app.status === "SHORTLISTED") && (
                  <WithdrawButton applicationId={app.application_id} />
                )}
              </div>
            </div>

            {app.rounds.length > 0 && (
              <ol className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                {app.rounds.map((round) => (
                  <li key={round.round_no} className="rounded-lg border border-black/10 p-3 text-sm dark:border-white/15">
                    <p className="font-medium">
                      {round.round_no}. {round.round_name}
                    </p>
                    <p className={round.result ? RESULT_STYLE[round.result] : "opacity-50"}>
                      {round.result ?? "Not reached yet"}
                      {round.result === "PENDING" && round.scheduled_at ? ` · ${formatDate(round.scheduled_at)}` : ""}
                    </p>
                    {round.feedback && <p className="text-xs opacity-70">“{round.feedback}”</p>}
                  </li>
                ))}
              </ol>
            )}
          </article>
        ))
      )}
    </main>
  );
}
