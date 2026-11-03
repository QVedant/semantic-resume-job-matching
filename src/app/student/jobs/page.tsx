import JobCard from "@/components/student/JobCard";
import { requireStudent } from "@/lib/auth";
import { openJobLocations, searchJobs, type JobSearchMode } from "@/lib/jobs";

type Props = {
  searchParams: Promise<{ q?: string; mode?: string; location?: string; minctc?: string; eligible?: string }>;
};

// Browse and search open jobs. A plain HTML form with method="get": submitting
// puts the filters in the address (/student/jobs?q=...&mode=meaning), and this
// server component reads them and queries the database. No client JavaScript needed.
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
    <main className="space-y-5">
      <h1 className="text-3xl font-bold tracking-tight">Browse jobs</h1>

      <form method="get" className="card space-y-4">
        <div className="space-y-2">
          <label htmlFor="q" className="label">Search</label>
          <input
            id="q"
            name="q"
            defaultValue={q}
            placeholder={'Keyword like "Python", or a sentence like "I want to build backend web services"'}
            className="input"
          />
          <div className="flex flex-wrap gap-4 text-sm">
            <label className="flex items-center gap-2">
              <input type="radio" name="mode" value="keyword" defaultChecked={mode === "keyword"} />
              Keyword search (exact words)
            </label>
            <label className="flex items-center gap-2">
              <input type="radio" name="mode" value="meaning" defaultChecked={mode === "meaning"} />
              <span>
                Search by <strong>meaning</strong> (AI)
              </span>
            </label>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <label htmlFor="location" className="label">Location</label>
            <select id="location" name="location" defaultValue={location} className="input">
              <option value="">Any</option>
              {locations.map((loc) => (
                <option key={loc} value={loc}>{loc}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="minctc" className="label">Minimum CTC (LPA)</label>
            <input id="minctc" name="minctc" type="number" min={0} step={1} defaultValue={minCtcLpa || ""} className="input" />
          </div>
          <label className="flex items-end gap-2 pb-2 text-sm">
            <input type="checkbox" name="eligible" value="1" defaultChecked={eligibleOnly} />
            Only jobs I&apos;m eligible for
          </label>
        </div>

        <button type="submit" className="btn-primary">Search</button>
      </form>

      <p className="text-sm opacity-70">
        {jobs.length} job{jobs.length === 1 ? "" : "s"}
        {mode === "meaning" ? ", ranked by how closely their meaning matches your search" : ""}
      </p>

      <div className="space-y-3">
        {jobs.map((job) => (
          <JobCard
            key={job.job_id}
            job={job}
            similarityLabel={mode === "meaning" ? "Relevance to your search" : undefined}
          />
        ))}
      </div>
    </main>
  );
}
