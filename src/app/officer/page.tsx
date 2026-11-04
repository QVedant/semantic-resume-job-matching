import Link from "next/link";
import Bar from "@/components/officer/Bar";
import PageHeader from "@/components/ui/PageHeader";
import { requireRole } from "@/lib/auth";
import { companyDot, companyText, formatCtc, formatPercent, STATUS_STYLE } from "@/lib/format";
import { getBranchStats, getCompanyStats, getOverview, getStatusCounts } from "@/lib/officer";

// Placement officer dashboard: campus-wide statistics, mostly computed from
// the view vw_application_overview with GROUP BY and COUNT ... FILTER.
export default async function OfficerDashboard() {
  await requireRole("PLACEMENT_OFFICER");
  const [overview, branches, statuses, companies] = await Promise.all([
    getOverview(),
    getBranchStats(),
    getStatusCounts(),
    getCompanyStats(),
  ]);
  const maxStatus = Math.max(1, ...statuses.map((s) => s.count));

  return (
    <main>
      <PageHeader
        title="Placement,"
        accent="overview"
        description={
          <>
            <strong>
              {overview.placed} of {overview.students}
            </strong>{" "}
            students placed · <strong>{overview.open_jobs}</strong> open jobs · <strong>{overview.applications}</strong>{" "}
            applications · average match <strong>{formatPercent(overview.avg_match)}</strong> · highest offer{" "}
            <strong>{overview.highest_offer ? formatCtc(overview.highest_offer) : "—"}</strong>
          </>
        }
      />

      <div className="grid items-start gap-5 lg:grid-cols-2">
        <section className="card space-y-4">
          <h2 className="section-label">Placed, by branch</h2>
          {branches.map((b) => (
            <Bar
              key={b.branch}
              label={
                <>
                  <span className="font-medium">{b.branch}</span>{" "}
                  <span className="text-muted">
                    {b.students} student{b.students === 1 ? "" : "s"}, avg CGPA {b.avg_cgpa.toFixed(2)}
                  </span>
                </>
              }
              value={b.placement_pct}
              max={100}
              display={`${b.placed}/${b.students}`}
            />
          ))}
        </section>

        <section className="card overflow-hidden p-0">
          <h2 className="section-label px-5 pt-4 pb-1">Applications, by status</h2>
          <ul className="divide-y divide-line">
            {statuses.map((s) => (
              <li key={s.status}>
                <Link
                  href={`/officer/applications?status=${s.status}`}
                  className="flex items-center gap-4 px-5 py-3 transition hover:bg-surface-muted"
                >
                  <span className={`${STATUS_STYLE[s.status]} w-24 justify-center`}>{s.status.toLowerCase()}</span>
                  <span className="flex-1">
                    <Bar value={s.count} max={maxStatus} display={String(s.count)} />
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      </div>

      <section className="card mt-5 overflow-x-auto p-0">
        <table className="w-full text-left text-sm">
          <thead className="table-head">
            <tr>
              <th className="px-5 py-3 font-semibold">Company</th>
              <th className="px-3 py-3 font-semibold">Industry</th>
              <th className="px-3 py-3 text-right font-semibold">Jobs (open)</th>
              <th className="px-3 py-3 text-right font-semibold">Applications</th>
              <th className="px-3 py-3 text-right font-semibold">Offers</th>
              <th className="px-5 py-3 text-right font-semibold">Top CTC</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {companies.map((c) => (
              <tr key={c.company_id} className="transition hover:bg-surface-muted">
                <td className="px-5 py-3">
                  <Link href={`/officer/applications?company=${c.company_id}`} className="flex items-center gap-2.5 font-medium hover:underline">
                    <span className={`h-2.5 w-2.5 rounded-[3px] ${companyDot(c.company_id)}`} aria-hidden />
                    <span className={companyText(c.company_id)}>{c.company}</span>
                  </Link>
                </td>
                <td className="px-3 py-3 text-muted">{c.industry ?? "—"}</td>
                <td className="px-3 py-3 text-right font-mono font-bold">
                  {c.jobs} ({c.open_jobs})
                </td>
                <td className="px-3 py-3 text-right font-mono font-bold">{c.applications}</td>
                <td className="px-3 py-3 text-right font-mono font-bold">{c.offers}</td>
                <td className="px-5 py-3 text-right font-mono font-bold">{c.top_ctc ? formatCtc(c.top_ctc) : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </main>
  );
}
