import Link from "next/link";
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
    <main className="space-y-5">
      <h1 className="text-3xl font-bold tracking-tight">Students</h1>

      <form method="get" className="card grid gap-4 sm:grid-cols-4">
        <div className="sm:col-span-2">
          <label htmlFor="q" className="label">Search</label>
          <input id="q" name="q" defaultValue={q} placeholder="Name or USN" className="input" />
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
          <label htmlFor="show" className="label">Show</label>
          <select id="show" name="show" defaultValue={show} className="input">
            {SHOW_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>
        <div className="flex gap-3 sm:col-span-4">
          <button type="submit" className="btn-primary">Apply filters</button>
          <Link href="/officer/students" className="btn-secondary">Clear</Link>
        </div>
      </form>

      <p className="text-sm opacity-70">{students.length} student{students.length === 1 ? "" : "s"}</p>

      <div className="card overflow-x-auto p-0">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-black/10 text-xs uppercase opacity-70 dark:border-white/15">
            <tr>
              <th className="px-4 py-3">Student</th>
              <th className="px-4 py-3">Branch</th>
              <th className="px-4 py-3 text-right">CGPA</th>
              <th className="px-4 py-3">Resume</th>
              <th className="px-4 py-3 text-right">Applications</th>
              <th className="px-4 py-3 text-right">Shortlisted</th>
              <th className="px-4 py-3 text-right">Offers</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-black/10 dark:divide-white/15">
            {students.map((s) => (
              <tr key={s.student_id}>
                <td className="px-4 py-3">
                  <p className="font-medium">{s.full_name}</p>
                  <p className="text-xs opacity-60">{s.usn} · graduating {s.grad_year ?? "—"}</p>
                </td>
                <td className="px-4 py-3">{s.branch}</td>
                <td className="px-4 py-3 text-right">{s.cgpa}</td>
                <td className="px-4 py-3">{s.has_resume ? "✓ Added" : <span className="text-amber-700 dark:text-amber-300">Missing</span>}</td>
                <td className="px-4 py-3 text-right">
                  {s.applications > 0 ? (
                    <Link href={`/officer/applications?q=${encodeURIComponent(s.usn)}`} className="underline">{s.applications}</Link>
                  ) : (
                    0
                  )}
                </td>
                <td className="px-4 py-3 text-right">{s.shortlisted}</td>
                <td className="px-4 py-3 text-right font-semibold">{s.offers}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {students.length === 0 && <p className="px-4 py-6 opacity-70">No students match these filters.</p>}
      </div>
    </main>
  );
}
