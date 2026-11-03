import { NextResponse } from "next/server";
import { query } from "@/lib/db";

type HealthRow = {
  database: string;
  pgvector_version: string | null;
  students: number;
  jobs: number;
  applications: number;
};

// GET /api/health
// Quick check that the app can reach PostgreSQL and pgvector.
// Open http://localhost:3000/api/health in the browser to see the result.
export async function GET() {
  try {
    const [row] = await query<HealthRow>(`
      SELECT current_database()                                          AS database,
             (SELECT extversion FROM pg_extension WHERE extname = 'vector') AS pgvector_version,
             (SELECT COUNT(*)::int FROM students)                        AS students,
             (SELECT COUNT(*)::int FROM job_postings)                    AS jobs,
             (SELECT COUNT(*)::int FROM applications)                    AS applications
    `);
    return NextResponse.json({ status: "ok", ...row });
  } catch (error) {
    // Show the real error only during development; never leak details in production.
    const message =
      process.env.NODE_ENV === "production"
        ? "Database unavailable"
        : error instanceof Error
          ? error.message
          : String(error);
    return NextResponse.json({ status: "error", message }, { status: 500 });
  }
}
