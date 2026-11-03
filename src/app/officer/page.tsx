import Link from "next/link";
import Bar from "@/components/officer/Bar";
import { requireRole } from "@/lib/auth";
import { query } from "@/lib/db";
import { formatCtc, formatPercent, STATUS_STYLE } from "@/lib/format";
import { getBranchStats, getCompanyStats, getOverview, getStatusCounts } from "@/lib/officer";

type OfficerProfile = { full_name: string; employee_id: string; department: string | null };

// Placement officer dashboard: campus-wide statistics, mostly computed from
// the view vw_application_overview with GROUP BY and COUNT ... FILTER.
export default async function OfficerDashboard() {
  const session = await requireRole("PLACEMENT_OFFICER");
  const [[profile], overview, branches, statuses, companies] = await Promise.all([
    query<OfficerProfile>(`SELECT full_name, employee_id, department FROM placement_officers WHERE user_id = $1`, [
      session.userId,
    ]),
    getOverview(),
    getBranchStats(),
    getStatusCounts(),
    getCompanyStats(),
  ]);
  const placementPct = overview.students ? Math.round((100 * overview.placed) / overview.students) : 0;
  const maxStatus = Math.max(1, ...statuses.map((s) => s.count));

  return (
    <main className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Placement overview</h1>
        <p className="opacity-70">
          {profile.full_name} · {profile.department} · Employee ID {profile.employee_id}
        </p>
      </div>

      <section className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        <Kpi label="Students" value={overview.students} />
        <Kpi label="Placed" value={`${overview.placed} (${placementPct}%)`} />
        <Kpi label="Open jobs" value={overview.open_jobs} />
        <Kpi label="Applications" value={overview.applications} />
        <Kpi label="Avg match score" value={formatPercent(overview.avg_match)} />
        <Kpi label="Highest offer" value={overview.highest_offer ? formatCtc(overview.highest_offer) : "—"} />
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="card space-y-4">
          <h2 className="font-semibold">Placement by branch</h2>
          {branches.map((b) => (
            <Bar
              key={b.branch}
              label={`${b.branch} · ${b.students} student${b.students === 1 ? "" : "s"} · avg CGPA ${b.avg_cgpa.toFixed(2)}`}
              value={b.placement_pct}
              max={100}
              display={`${b.placed}/${b.students} placed (${b.placement_pct}%)`}
            />
          ))}
        </section>

        <section className="card space-y-4">
          <h2 className="font-semibold">Applications by status</h2>
          {statuses.map((s) => (
            <div key={s.status} className="flex items-center gap-3">
              <span className={`w-28 shrink-0 rounded-full px-2.5 py-0.5 text-center text-xs font-medium ${STATUS_STYLE[s.status]}`}>
                {s.status}
              </span>
              <div className="flex-1">
                <Bar label="" value={s.count} max={maxStatus} />
              </div>
              <Link href={`/officer/applications?status=${s.status}`} className="text-sm underline">
                View
              </Link>
            </div>
          ))}
        </section>
      </div>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Companies</h2>
        <div className="card overflow-x-auto p-0">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-black/10 text-xs uppercase opacity-70 dark:border-white/15">
              <tr>
                <th className="px-4 py-3">Company</th>
                <th className="px-4 py-3">Industry</th>
                <th className="px-4 py-3 text-right">Jobs (open)</th>
                <th className="px-4 py-3 text-right">Applications</th>
                <th className="px-4 py-3 text-right">Offers</th>
                <th className="px-4 py-3 text-right">Top CTC</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/10 dark:divide-white/15">
              {companies.map((c) => (
                <tr key={c.company_id}>
                  <td className="px-4 py-3 font-medium">
                    <Link href={`/officer/applications?company=${c.company_id}`} className="hover:underline">
                      {c.company}
                    </Link>
                  </td>
                  <td className="px-4 py-3 opacity-80">{c.industry ?? "—"}</td>
                  <td className="px-4 py-3 text-right">
                    {c.jobs} ({c.open_jobs})
                  </td>
                  <td className="px-4 py-3 text-right">{c.applications}</td>
                  <td className="px-4 py-3 text-right">{c.offers}</td>
                  <td className="px-4 py-3 text-right">{c.top_ctc ? formatCtc(c.top_ctc) : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}

function Kpi({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="card p-4">
      <p className="text-xs opacity-70">{label}</p>
      <p className="text-xl font-semibold">{value}</p>
    </div>
  );
}
