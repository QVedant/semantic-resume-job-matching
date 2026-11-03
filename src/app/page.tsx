import Link from "next/link";
import { getSession } from "@/lib/auth";
import { query } from "@/lib/db";
import { ROLE_HOME } from "@/lib/session";

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

const ROLE_CARDS = [
  {
    title: "Students",
    text: "Get jobs ranked by how well they fit the meaning of your resume, see which ones you are eligible for, and apply in one click.",
  },
  {
    title: "Recruiters",
    text: "Post job drives and review applicants ranked by semantic match score, so the best-fitting candidates come first.",
  },
  {
    title: "Placement officers",
    text: "Track every application, interview round and placement across branches and companies from one dashboard.",
  },
];

export default async function Home() {
  const [{ stats, error }, session] = await Promise.all([loadStats(), getSession()]);

  return (
    <main className="mx-auto max-w-5xl space-y-12 px-6 py-16">
      <header className="max-w-3xl space-y-4">
        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">Semantic Resume–Job Matching</h1>
        <p className="text-lg opacity-80">
          A campus placement platform that matches students to jobs by meaning, not just keywords,
          using PostgreSQL and pgvector.
        </p>
        <div className="flex flex-wrap gap-3 pt-2">
          {session ? (
            <Link href={ROLE_HOME[session.role]} className="btn-primary">
              Go to my dashboard
            </Link>
          ) : (
            <>
              <Link href="/register" className="btn-primary">
                Create an account
              </Link>
              <Link href="/login" className="btn-secondary">
                Log in
              </Link>
            </>
          )}
        </div>
      </header>

      <section className="grid gap-4 sm:grid-cols-3">
        {ROLE_CARDS.map((card) => (
          <div key={card.title} className="card">
            <h2 className="mb-2 font-semibold">{card.title}</h2>
            <p className="text-sm opacity-80">{card.text}</p>
          </div>
        ))}
      </section>

      <section className="card">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide opacity-70">
          Live from the database
        </h2>
        {stats ? (
          <dl className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <Stat label="Students" value={stats.students} />
            <Stat label="Companies" value={stats.companies} />
            <Stat label="Open jobs" value={stats.open_jobs} />
            <Stat label="Applications" value={stats.applications} />
          </dl>
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
