import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { BRANCHES } from "@/lib/constants";
import { formatCtc, formatDate, formatPercent, STATUS_STYLE } from "@/lib/format";
import { companyOptions, searchApplications } from "@/lib/officer";

const STATUSES = ["APPLIED", "SHORTLISTED", "REJECTED", "WITHDRAWN", "OFFERED", "HIRED"];

type Props = {
  searchParams: Promise<{ q?: string; company?: string; branch?: string; status?: string; sort?: string }>;
};

// Every application on campus, from the view vw_application_overview,
// filtered with a plain GET form (filters live in the address bar).
export default async function AllApplicationsPage({ searchParams }: Props) {
  await requireRole("PLACEMENT_OFFICER");
  const params = await searchParams;

  const q = (params.q ?? "").trim().slice(0, 100);
  const companyId = Number(params.company) || undefined;
  const branch = BRANCHES.includes(params.branch as (typeof BRANCHES)[number]) ? params.branch : undefined;
  const status = STATUSES.includes(params.status ?? "") ? params.status : undefined;
  const sort = params.sort === "match" ? "match" : "recent";

  const [rows, companies] = await Promise.all([
    searchApplications({ q: q || undefined, companyId, branch, status, sort }),
    companyOptions(),
  ]);

  return (
    <main className="space-y-5">
      <h1 className="text-3xl font-bold tracking-tight">All applications</h1>

      <form method="get" className="card grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <div className="lg:col-span-2">
          <label htmlFor="q" className="label">Search</label>
          <input id="q" name="q" defaultValue={q} placeholder="Student name, USN or job title" className="input" />
        </div>
        <div>
          <label htmlFor="company" className="label">Company</label>
          <select id="company" name="company" defaultValue={companyId ?? ""} className="input">
            <option value="">All</option>
            {companies.map((c) => (
              <option key={c.company_id} value={c.company_id}>{c.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="branch" className="label">Branch</label>
          <select id="branch" name="branch" defaultValue={branch ?? ""} className="input">
            <option value="">All</option>
            {BRANCHES.map((b) => (
              <option key={b} value={b}>{b}</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="status" className="label">Status</label>
          <select id="status" name="status" defaultValue={status ?? ""} className="input">
            <option value="">All</option>
            {STATUSES.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>
        <div className="flex items-end gap-3 sm:col-span-2 lg:col-span-5">
          <label className="flex items-center gap-2 text-sm">
            Sort by
            <select name="sort" defaultValue={sort} className="input w-auto">
              <option value="recent">Most recent</option>
              <option value="match">Highest match score</option>
            </select>
          </label>
          <button type="submit" className="btn-primary">Apply filters</button>
          <Link href="/officer/applications" className="btn-secondary">Clear</Link>
        </div>
      </form>

      <p className="text-sm opacity-70">{rows.length} application{rows.length === 1 ? "" : "s"}</p>

      <div className="card overflow-x-auto p-0">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-black/10 text-xs uppercase opacity-70 dark:border-white/15">
            <tr>
              <th className="px-4 py-3">Student</th>
              <th className="px-4 py-3">Job</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-right">Match</th>
              <th className="px-4 py-3 text-right">Rounds</th>
              <th className="px-4 py-3">Applied</th>
              <th className="px-4 py-3">Reviewed by</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-black/10 dark:divide-white/15">
            {rows.map((row) => (
              <tr key={row.application_id}>
                <td className="px-4 py-3">
                  <p className="font-medium">{row.student_name}</p>
                  <p className="text-xs opacity-60">{row.usn} · {row.branch} · CGPA {row.cgpa}</p>
                </td>
                <td className="px-4 py-3">
                  <p>{row.job_title}</p>
                  <p className="text-xs opacity-60">{row.company_name} · {formatCtc(row.ctc)}</p>
                </td>
                <td className="px-4 py-3">
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_STYLE[row.status]}`}>{row.status}</span>
                </td>
                <td className="px-4 py-3 text-right font-medium">{formatPercent(row.match_score)}</td>
                <td className="px-4 py-3 text-right">{row.rounds_passed}/{row.total_rounds}</td>
                <td className="px-4 py-3">{formatDate(row.applied_at)}</td>
                <td className="px-4 py-3 text-xs opacity-80">{row.reviewed_by_email ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {rows.length === 0 && <p className="px-4 py-6 opacity-70">No applications match these filters.</p>}
      </div>
    </main>
  );
}
