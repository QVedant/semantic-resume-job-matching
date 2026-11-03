import { query } from "@/lib/db";

// Read the database on every request (not once at build time).
export const dynamic = "force-dynamic";

type Stats = {
  students: number;
  companies: number;
  open_jobs: number;
  applications: number;
};

// Server component: this code runs on the server, so it may use lib/db.ts.
// The browser only receives the finished HTML.
async function loadStats(): Promise<{ stats: Stats | null; error: string | null }> {
  try {
    const [stats] = await query<Stats>(`
      SELECT (SELECT COUNT(*)::int FROM students)                            AS students,
             (SELECT COUNT(*)::int FROM companies)                           AS companies,
             (SELECT COUNT(*)::int FROM job_postings WHERE status = 'OPEN')  AS open_jobs,
             (SELECT COUNT(*)::int FROM applications)                        AS applications
    `);
    return { stats, error: null };
  } catch (error) {
    return { stats: null, error: error instanceof Error ? error.message : String(error) };
  }
}

export default async function Home() {
  const { stats, error } = await loadStats();

  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col justify-center gap-8 px-6 py-16">
      <header className="space-y-3">
        <h1 className="text-4xl font-bold tracking-tight">Semantic Resume–Job Matching</h1>
        <p className="text-lg opacity-80">
          A campus placement platform that matches students to jobs by meaning, not just
          keywords, using PostgreSQL and pgvector.
        </p>
      </header>

      <section className="rounded-xl border border-black/10 p-6 dark:border-white/15">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide opacity-70">
          Database status
        </h2>
        {stats ? (
          <div className="space-y-4">
            <p className="font-medium text-green-700 dark:text-green-400">
              ✓ Connected to PostgreSQL
            </p>
            <dl className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <Stat label="Students" value={stats.students} />
              <Stat label="Companies" value={stats.companies} />
              <Stat label="Open jobs" value={stats.open_jobs} />
              <Stat label="Applications" value={stats.applications} />
            </dl>
          </div>
        ) : (
          <div className="space-y-2">
            <p className="font-medium text-red-700 dark:text-red-400">✗ Cannot reach the database</p>
            <p className="text-sm opacity-80">{error}</p>
            <p className="text-sm opacity-80">
              Check that PostgreSQL is running and that DATABASE_URL in your .env file is correct.
            </p>
          </div>
        )}
      </section>

      <p className="text-sm opacity-60">Login and role dashboards are coming in the next steps.</p>
    </main>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <dt className="text-sm opacity-70">{label}</dt>
      <dd className="text-3xl font-semibold">{value}</dd>
    </div>
  );
}
