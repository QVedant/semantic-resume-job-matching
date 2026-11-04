import Link from "next/link";
import WithdrawButton from "@/components/student/WithdrawButton";
import EmptyState from "@/components/ui/EmptyState";
import PageHeader from "@/components/ui/PageHeader";
import { getStudentApplications, type StudentApplication } from "@/lib/applications";
import { requireStudent } from "@/lib/auth";
import { companyText, formatCtc, formatPercent, formatShortDate, STATUS_STYLE } from "@/lib/format";

const ROUND_CHIP: Record<string, string> = {
  PASSED: "chip chip-green",
  PENDING: "chip chip-amber",
  REJECTED: "chip chip-red",
};

const GROUPS: { label: string; statuses: string[] }[] = [
  { label: "In progress", statuses: ["APPLIED", "SHORTLISTED"] },
  { label: "Offers", statuses: ["OFFERED", "HIRED"] },
  { label: "Closed", statuses: ["REJECTED", "WITHDRAWN"] },
];

// The student's applications with status and interview progress, read from
// the view vw_application_overview, grouped into in progress / offers / closed.
export default async function MyApplicationsPage() {
  const { studentId } = await requireStudent();
  const applications = await getStudentApplications(studentId);
  const inProgress = applications.filter((a) => a.status === "APPLIED" || a.status === "SHORTLISTED").length;

  return (
    <main>
      <PageHeader
        title="My"
        accent="applications"
        description={
          <>
            <strong>{inProgress}</strong> in progress · <strong>{applications.length}</strong> in total
          </>
        }
      />

      {applications.length === 0 ? (
        <EmptyState title="You haven't applied anywhere yet">
          <Link href="/student/recommended" className="link">
            See the jobs that match your resume
          </Link>
        </EmptyState>
      ) : (
        <div className="card overflow-hidden p-0">
          {GROUPS.map((group) => ({ ...group, list: applications.filter((a) => group.statuses.includes(a.status)) }))
            .filter((group) => group.list.length > 0)
            .map((group, index) => (
              <section key={group.label} className={index > 0 ? "border-t border-line" : ""}>
                <h2 className="section-label px-5 pt-4 pb-1">{group.label}</h2>
                <ul className="divide-y divide-line">
                  {group.list.map((app) => (
                    <ApplicationRow key={app.application_id} app={app} />
                  ))}
                </ul>
              </section>
            ))}
        </div>
      )}
    </main>
  );
}

function ApplicationRow({ app }: { app: StudentApplication }) {
  return (
    <li className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0 space-y-2">
        <p className="flex flex-wrap items-baseline gap-x-2">
          <span className={`text-[13px] font-medium ${companyText(app.company_id)}`}>{app.company_name}</span>
          <Link href={`/student/jobs/${app.job_id}`} className="text-[15px] font-medium hover:underline">
            {app.job_title}
          </Link>
        </p>
        <div className="flex flex-wrap gap-1.5">
          <span className={STATUS_STYLE[app.status]}>{app.status.toLowerCase()}</span>
          <span className="chip chip-gray">match {formatPercent(app.match_score)}</span>
          <span className="chip chip-gray">{formatCtc(app.ctc)}</span>
          <span className="chip chip-gray">applied {formatShortDate(app.applied_at)}</span>
        </div>
        {app.rounds.length > 0 && (
          <ol className="flex flex-wrap items-center gap-1.5 text-sm" aria-label="Interview rounds">
            {app.rounds.map((round) => (
              <li key={round.round_no} className="flex items-center gap-1.5">
                <span className={round.result ? ROUND_CHIP[round.result] : "chip chip-gray opacity-70"}>
                  {round.round_no}. {round.round_name.toLowerCase()}
                  {round.result === "PASSED" && " ✓"}
                  {round.result === "REJECTED" && " ✗"}
                  {round.result === "PENDING" && (round.scheduled_at ? ` · ${formatShortDate(round.scheduled_at)}` : " · pending")}
                </span>
                {round.feedback && <span className="text-xs text-muted">“{round.feedback}”</span>}
              </li>
            ))}
          </ol>
        )}
      </div>
      {(app.status === "APPLIED" || app.status === "SHORTLISTED") && (
        <div className="shrink-0">
          <WithdrawButton applicationId={app.application_id} />
        </div>
      )}
    </li>
  );
}
