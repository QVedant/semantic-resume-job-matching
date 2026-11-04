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

const STEPS = [
  { title: "Write your resume", text: "Your skills and projects, in your own words, up to 300 words." },
  { title: "The AI reads its meaning", text: "A model on our server turns it into a 768-number vector." },
  { title: "Jobs are ranked for you", text: "PostgreSQL and pgvector compare it with every open job." },
];

const ROLES = [
  { name: "Students", color: "text-dept-1", text: "see jobs ranked by fit, check eligibility, apply in one click" },
  { name: "Recruiters", color: "text-dept-2", text: "post drives and review applicants ranked by match score" },
  { name: "Placement cell", color: "text-dept-3", text: "follow every application, round and offer across campus" },
];

export default async function Home() {
  const [{ stats, error }, session] = await Promise.all([loadStats(), getSession()]);

  return (
    <main className="mx-auto max-w-3xl px-4 py-12 sm:px-6 sm:py-16">
      <h1 className="font-display text-5xl leading-[1.05] sm:text-6xl">
        Campus placements, <em className="text-accent-ink">matched by meaning</em>
      </h1>
      <p className="mt-5 max-w-2xl text-lg text-muted">
        “Built REST APIs in Node.js” and “design backend web services” share no keywords, but they mean nearly the
        same thing. This platform understands that, so students find the jobs that actually fit them.
      </p>
      <div className="mt-7 flex flex-wrap gap-2">
        {session ? (
          <Link href={ROLE_HOME[session.role]} className="btn-primary px-5 py-2.5">
            Open my dashboard
          </Link>
        ) : (
          <>
            <Link href="/register" className="btn-primary px-5 py-2.5">
              Create an account
            </Link>
            <Link href="/login" className="btn-secondary px-5 py-2.5">
              Log in
            </Link>
          </>
        )}
      </div>

      {stats ? (
        <p className="mt-10 text-[15px] text-muted [&_strong]:font-semibold [&_strong]:text-foreground">
          Right now: <strong>{stats.students}</strong> students · <strong>{stats.companies}</strong> companies ·{" "}
          <strong>{stats.open_jobs}</strong> open jobs · <strong>{stats.applications}</strong> applications
        </p>
      ) : (
        <div className="alert-error mt-10 space-y-1">
          <p className="font-semibold">Can&apos;t reach the database</p>
          <p>{error}</p>
          <p>Check that PostgreSQL is running and that DATABASE_URL in .env is correct.</p>
        </div>
      )}

      <div className="card mt-4 overflow-hidden p-0">
        <section>
          <h2 className="section-label px-5 pt-4 pb-1">How matching works</h2>
          <ol className="divide-y divide-line">
            {STEPS.map((step, index) => (
              <li key={step.title} className="flex items-baseline gap-3 px-5 py-3">
                <span className="font-mono text-sm font-bold text-muted">{index + 1}.</span>
                <span>
                  <span className="font-medium">{step.title}</span> <span className="text-muted">{step.text}</span>
                </span>
              </li>
            ))}
          </ol>
        </section>
        <section className="border-t border-line">
          <h2 className="section-label px-5 pt-4 pb-1">Who it&apos;s for</h2>
          <ul className="divide-y divide-line">
            {ROLES.map((role) => (
              <li key={role.name} className="flex flex-wrap items-baseline gap-x-2 px-5 py-3">
                <span className={`text-[13px] font-medium ${role.color}`}>{role.name}</span>
                <span>{role.text}</span>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </main>
  );
}
