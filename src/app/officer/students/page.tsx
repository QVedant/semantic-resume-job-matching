import Link from "next/link";
import PageHeader from "@/components/ui/PageHeader";
import { requireRole } from "@/lib/auth";
import { BRANCHES } from "@/lib/constants";
import { searchStudents, type StudentFilter } from "@/lib/officer";

const SHOW_OPTIONS: { value: StudentFilter; label: string }[] = [
  { value: "all", label: "All students" },
  { value: "placed", label: "Placed (offer or hired)" },
  { value: "not_placed", label: "Not placed yet" },
  { value: "not_applied", label: "Haven't applied anywhere" },
];

type Props = { searchParams: Promise<{ q?: string; branch?: string; show?: string }> };

// Students with application counts. "Placed" / "Not placed" / "Haven't
// applied" are HAVING filters on the aggregated counts.
export default async function StudentsPage({ searchParams }: Props) {
  await requireRole("PLACEMENT_OFFICER");
  const params = await searchParams;

  const q = (params.q ?? "").trim().slice(0, 100);
  const branch = BRANCHES.includes(params.branch as (typeof BRANCHES)[number]) ? params.branch : undefined;
  const show = (SHOW_OPTIONS.find((o) => o.value === params.show)?.value ?? "all") as StudentFilter;

  const students = await searchStudents({ q: q || undefined, branch, show });

  return (
    <main>
      <PageHeader
        title="All"
        accent="students"
        description={
          <>
            <strong>{students.length}</strong> student{students.length === 1 ? "" : "s"} ·{" "}
            {SHOW_OPTIONS.find((o) => o.value === show)?.label.toLowerCase()}
          </>
        }
      />

      <form method="get" className="card mb-5 flex flex-wrap items-end gap-3 p-4">
        <div className="min-w-56 flex-1">
          <label htmlFor="q" className="label">Search</label>
          <input id="q" name="q" defaultValue={q} placeholder="Name or USN" className="input" />
        </div>
        <div className="w-40">
          <label htmlFor="branch" className="label">Branch</label>
          <select id="branch" name="branch" defaultValue={branch ?? ""} className="input">
            <option value="">All</option>
            {BRANCHES.map((b) => (
              <option key={b} value={b}>{b}</option>
            ))}
          </select>
        </div>
        <div className="w-56">
          <label htmlFor="show" className="label">Show</label>
          <select id="show" name="show" defaultValue={show} className="input">
            {SHOW_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>
        <div className="flex gap-2">
          <button type="submit" className="btn-primary">Apply</button>
          <Link href="/officer/students" className="btn-secondary">Clear</Link>
        </div>
      </form>

      {students.length === 0 ? (
        <p className="card text-center text-sm text-muted">No students match these filters.</p>
      ) : (
        <div className="card overflow-x-auto p-0">
          <table className="w-full text-left text-sm">
            <thead className="table-head">
              <tr>
                <th className="px-5 py-3 font-semibold">Student</th>
                <th className="px-3 py-3 font-semibold">Branch</th>
                <th className="px-3 py-3 text-right font-semibold">CGPA</th>
                <th className="px-3 py-3 font-semibold">Resume</th>
                <th className="px-3 py-3 text-right font-semibold">Applied</th>
                <th className="px-3 py-3 text-right font-semibold">Shortlisted</th>
                <th className="px-5 py-3 text-right font-semibold">Offers</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {students.map((s) => (
                <tr key={s.student_id} className="transition hover:bg-surface-muted">
                  <td className="px-5 py-3">
                    <p className="font-medium">{s.full_name}</p>
                    <p className="font-mono text-xs text-muted">
                      {s.usn} class of {s.grad_year ?? "—"}
                    </p>
                  </td>
                  <td className="px-3 py-3">{s.branch}</td>
                  <td className="px-3 py-3 text-right font-mono font-bold">{s.cgpa}</td>
                  <td className="px-3 py-3">
                    <span className="flex flex-wrap items-center gap-1.5">
                      <span className={s.has_resume ? "chip chip-green" : "chip chip-amber"}>{s.has_resume ? "text" : "no text"}</span>
                      {s.has_pdf && (
                        <a href={`/api/resumes/${s.student_id}`} target="_blank" rel="noreferrer" className="chip chip-blue hover:underline">
                          pdf
                        </a>
                      )}
                    </span>
                  </td>
                  <td className="px-3 py-3 text-right font-mono font-bold">
                    {s.applications > 0 ? (
                      <Link href={`/officer/applications?q=${encodeURIComponent(s.usn)}`} className="link">
                        {s.applications}
                      </Link>
                    ) : (
                      0
                    )}
                  </td>
                  <td className="px-3 py-3 text-right font-mono font-bold">{s.shortlisted}</td>
                  <td className="px-5 py-3 text-right font-mono font-bold">{s.offers}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
