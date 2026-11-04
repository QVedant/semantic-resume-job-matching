import Link from "next/link";
import JobRow from "@/components/student/JobCard";
import EmptyState from "@/components/ui/EmptyState";
import PageHeader from "@/components/ui/PageHeader";
import { requireStudent } from "@/lib/auth";
import { openJobLocations, searchJobs, type JobSearchMode } from "@/lib/jobs";

type Props = {
  searchParams: Promise<{ q?: string; mode?: string; location?: string; minctc?: string; eligible?: string }>;
};

// Browse and search open jobs. Plain HTML forms with method="get": the
// filters go into the address (/student/jobs?q=...&mode=meaning) and this
// server component reads them and queries the database. The command bar at
// the top of the page submits here too, in "meaning" mode.
export default async function BrowseJobsPage({ searchParams }: Props) {
  const { studentId } = await requireStudent();
  const params = await searchParams;

  const q = (params.q ?? "").trim().slice(0, 300);
  const mode: JobSearchMode = params.mode === "meaning" && q ? "meaning" : "keyword";
  const location = params.location ?? "";
  const minCtcLpa = Number(params.minctc) || 0;
  const eligibleOnly = params.eligible === "1";

  const [jobs, locations] = await Promise.all([
    searchJobs(studentId, { mode, q, location: location || undefined, minCtcLpa, eligibleOnly }),
    openJobLocations(),
  ]);

  return (
    <main>
      {mode === "meaning" ? (
        <PageHeader
          title="Search,"
          accent="by meaning"
          description={
            <>
              <strong>{jobs.length}</strong> jobs ranked by how close they are to “{q}”
            </>
          }
        />
      ) : (
        <PageHeader
          title="Open"
          accent="jobs"
          description={
            <>
              <strong>{jobs.length}</strong> {q ? <>jobs containing “{q}”</> : "jobs you can browse"}, best match for your resume first
            </>
          }
        />
      )}

      <form method="get" className="card mb-5 flex flex-wrap items-end gap-3 p-4">
        <div className="min-w-56 flex-1">
          <label htmlFor="q" className="label">
            Search
          </label>
          <input id="q" name="q" defaultValue={q} placeholder="Python, Bengaluru, or a whole sentence" className="input" />
        </div>
        <fieldset>
          <legend className="label">Match by</legend>
          <div className="flex rounded-lg border border-line-strong bg-surface p-0.5 text-sm">
            {[
              { value: "keyword", label: "Exact words" },
              { value: "meaning", label: "Meaning" },
            ].map((option) => (
              <label
                key={option.value}
                className="cursor-pointer rounded-md px-3 py-1.5 text-muted has-[:checked]:bg-ink has-[:checked]:font-medium has-[:checked]:text-on-ink"
              >
                <input type="radio" name="mode" value={option.value} defaultChecked={mode === option.value} className="sr-only" />
                {option.label}
              </label>
            ))}
          </div>
        </fieldset>
        <div className="w-40">
          <label htmlFor="location" className="label">
            Location
          </label>
          <select id="location" name="location" defaultValue={location} className="input">
            <option value="">Any</option>
            {locations.map((loc) => (
              <option key={loc} value={loc}>
                {loc}
              </option>
            ))}
          </select>
        </div>
        <div className="w-32">
          <label htmlFor="minctc" className="label">
            Min CTC (LPA)
          </label>
          <input id="minctc" name="minctc" type="number" min={0} step={1} defaultValue={minCtcLpa || ""} className="input" />
        </div>
        <label className="flex items-center gap-2 pb-2.5 text-sm">
          <input type="checkbox" name="eligible" value="1" defaultChecked={eligibleOnly} />
          Eligible only
        </label>
        <div className="flex gap-2">
          <button type="submit" className="btn-primary">
            Apply
          </button>
          <Link href="/student/jobs" className="btn-secondary">
            Clear
          </Link>
        </div>
      </form>

      {jobs.length === 0 ? (
        <EmptyState title="No jobs match these filters">Try fewer filters, or describe the job you want in your own words.</EmptyState>
      ) : (
        <ul className="card divide-y divide-line overflow-hidden p-0">
          {jobs.map((job) => (
            <JobRow key={job.job_id} job={job} scoreLabel={mode === "meaning" ? "relevance" : undefined} />
          ))}
        </ul>
      )}
    </main>
  );
}
