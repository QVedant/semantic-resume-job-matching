import { NextResponse } from "next/server";
import { requireApiRole, studentIdForUser } from "@/lib/auth";
import { searchJobs } from "@/lib/jobs";

// GET /api/match?limit=10
// Open jobs ranked by how close their meaning is to the logged-in student's
// resume: VECTOR SIMILARITY SEARCH with pgvector (see searchJobs in lib/jobs.ts).
//   <=> is cosine distance (0 = same direction); ORDER BY it + LIMIT is the
//   "k nearest neighbours" query that HNSW indexes are built for.
// Each job also carries relational eligibility flags (CGPA, branch, deadline,
// already applied): meaning from vectors, rules from SQL.
export async function GET(request: Request) {
  const auth = await requireApiRole("STUDENT");
  if (auth instanceof NextResponse) return auth;

  const studentId = await studentIdForUser(auth.userId);
  if (!studentId) return NextResponse.json({ error: "Student profile not found." }, { status: 404 });

  const requested = Number(new URL(request.url).searchParams.get("limit") ?? 10);
  const limit = Number.isInteger(requested) && requested > 0 ? Math.min(requested, 50) : 10;

  const matches = (await searchJobs(studentId, { mode: "recommended", limit })).filter(
    (job) => job.similarity !== null,
  );
  if (matches.length === 0) {
    return NextResponse.json({
      matches: [],
      message: "Add your resume text first so we can find jobs that match it.",
    });
  }
  return NextResponse.json({ matches });
}
