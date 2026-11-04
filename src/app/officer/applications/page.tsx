import Link from "next/link";
import EmptyState from "@/components/ui/EmptyState";
import PageHeader from "@/components/ui/PageHeader";
import { requireRole } from "@/lib/auth";
import { BRANCHES } from "@/lib/constants";
import { companyText, formatPercent, formatShortDate, STATUS_STYLE } from "@/lib/format";
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
    <main>
      <PageHeader
        title="All"
        accent="applications"
        description={
          <>
            <strong>{rows.length}</strong> application{rows.length === 1 ? "" : "s"}
            {q && <> matching “{q}”</>}
            {status && <> with status {status.toLowerCase()}</>}
          </>
        }
      />

      <form method="get" className="card mb-5 flex flex-wrap items-end gap-3 p-4">
        <div className="min-w-56 flex-1">
          <label htmlFor="q" className="label">
            Search
          </label>
          <input id="q" name="q" defaultValue={q} placeholder="Student, USN or job title" className="input" />
        </div>
        <Select id="company" label="Company" value={companyId ?? ""} options={companies.map((c) => [String(c.company_id), c.name])} />
        <Select id="branch" label="Branch" value={branch ?? ""} options={BRANCHES.map((b) => [b, b])} />
        <Select id="status" label="Status" value={status ?? ""} options={STATUSES.map((s) => [s, s.toLowerCase()])} />
        <Select id="sort" label="Sort by" value={sort} options={[["recent", "Most recent"], ["match", "Best match"]]} noAll />
        <div className="flex gap-2">
          <button type="submit" className="btn-primary">
            Apply
          </button>
          <Link href="/officer/applications" className="btn-secondary">
            Clear
          </Link>
        </div>
      </form>

      {rows.length === 0 ? (
        <EmptyState title="No applications match these filters">Clear a filter or try a shorter search.</EmptyState>
      ) : (
        <div className="card overflow-x-auto p-0">
          <table className="w-full text-left text-sm">
            <thead className="table-head">
              <tr>
                <th className="px-5 py-3 font-semibold">Student</th>
                <th className="px-3 py-3 font-semibold">Job</th>
                <th className="px-3 py-3 font-semibold">Status</th>
                <th className="px-3 py-3 text-right font-semibold">Match</th>
                <th className="px-3 py-3 text-right font-semibold">Rounds</th>
                <th className="px-3 py-3 font-semibold">Applied</th>
                <th className="px-5 py-3 font-semibold">Reviewed by</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {rows.map((row) => (
                <tr key={row.application_id} className="transition hover:bg-surface-muted">
                  <td className="px-5 py-3">
                    <p className="font-medium">{row.student_name}</p>
                    <p className="font-mono text-xs text-muted">
                      {row.usn} {row.branch} {row.cgpa}
                    </p>
                  </td>
                  <td className="px-3 py-3">
                    <p className={`text-[13px] font-medium ${companyText(row.company_id)}`}>{row.company_name}</p>
                    <p>{row.job_title}</p>
                  </td>
                  <td className="px-3 py-3">
                    <span className={STATUS_STYLE[row.status]}>{row.status.toLowerCase()}</span>
                  </td>
                  <td className="px-3 py-3 text-right font-mono font-bold">{formatPercent(row.match_score)}</td>
                  <td className="px-3 py-3 text-right font-mono font-bold">
                    {row.rounds_passed}/{row.total_rounds}
                  </td>
                  <td className="px-3 py-3 font-mono text-xs">{formatShortDate(row.applied_at)}</td>
                  <td className="px-5 py-3 text-xs text-muted">{row.reviewed_by_email ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}

function Select({
  id,
  label,
  value,
  options,
  noAll,
}: {
  id: string;
  label: string;
  value: string | number;
  options: [string, string][];
  noAll?: boolean;
}) {
  return (
    <div className="w-40">
      <label htmlFor={id} className="label">
        {label}
      </label>
      <select id={id} name={id} defaultValue={value} className="input">
        {!noAll && <option value="">All</option>}
        {options.map(([optionValue, text]) => (
          <option key={optionValue} value={optionValue}>
            {text}
          </option>
        ))}
      </select>
    </div>
  );
}
