import { NextResponse } from "next/server";
import { requireApiRole } from "@/lib/auth";
import { query } from "@/lib/db";

type MatchRow = {
  job_id: number;
  title: string;
  company: string;
  location: string | null;
  ctc: string | null;
  min_cgpa: string | null;
  eligible_branches: string | null;
  deadline: string | null;
  similarity: string;
  match_score: string | null;
  cgpa_ok: boolean;
  branch_ok: boolean;
  deadline_ok: boolean;
  already_applied: boolean;
};

// GET /api/match?limit=10
// Open jobs ranked by how close their meaning is to the logged-in student's
// resume: VECTOR SIMILARITY SEARCH with pgvector.
//   <=> is cosine distance (0 = same direction). Ordering by it, with LIMIT,
//   is the "k nearest neighbours" query the HNSW index (idx_job_emb_hnsw) serves.
// Each job also carries relational eligibility flags, so the page can show
// "great match, but your CGPA is below the minimum". That is the hybrid of
// the two paradigms: meaning from vectors, rules from SQL.
export async function GET(request: Request) {
  const auth = await requireApiRole("STUDENT");
  if (auth instanceof NextResponse) return auth;

  const requested = Number(new URL(request.url).searchParams.get("limit") ?? 10);
  const limit = Number.isInteger(requested) && requested > 0 ? Math.min(requested, 50) : 10;

  const rows = await query<MatchRow>(
    `WITH me AS (
       SELECT s.student_id, s.cgpa, s.branch, r.embedding
       FROM students s
       JOIN resume_embeddings r ON r.student_id = s.student_id AND r.is_current
       WHERE s.user_id = $1
     )
     SELECT j.job_id, j.title, c.name AS company, j.location, j.ctc, j.min_cgpa,
            j.eligible_branches, j.deadline,
            ROUND((1 - (je.embedding <=> me.embedding))::numeric, 4)  AS similarity,
            compute_match_score(me.student_id, j.job_id)              AS match_score,
            (j.min_cgpa IS NULL OR me.cgpa >= j.min_cgpa)             AS cgpa_ok,
            (j.eligible_branches IS NULL
             OR me.branch = ANY (string_to_array(replace(j.eligible_branches, ' ', ''), ',')))
                                                                      AS branch_ok,
            (j.deadline IS NULL OR j.deadline >= CURRENT_DATE)        AS deadline_ok,
            EXISTS (SELECT 1 FROM applications a
                     WHERE a.student_id = me.student_id AND a.job_id = j.job_id)
                                                                      AS already_applied
     FROM me
     JOIN job_embeddings je ON je.is_current
     JOIN job_postings   j  ON j.job_id = je.job_id AND j.status = 'OPEN'
     JOIN companies      c  ON c.company_id = j.company_id
     ORDER BY je.embedding <=> me.embedding
     LIMIT $2`,
    [auth.userId, limit],
  );

  if (rows.length === 0) {
    return NextResponse.json({
      matches: [],
      message: "Add your resume text first so we can find jobs that match it.",
    });
  }

  return NextResponse.json({
    matches: rows.map((row) => ({
      ...row,
      similarity: Number(row.similarity),
      match_score: row.match_score === null ? null : Number(row.match_score),
      ctc: row.ctc === null ? null : Number(row.ctc),
      min_cgpa: row.min_cgpa === null ? null : Number(row.min_cgpa),
      eligible: row.cgpa_ok && row.branch_ok && row.deadline_ok,
    })),
  });
}
