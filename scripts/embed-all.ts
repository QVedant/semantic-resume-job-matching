// Generates real embeddings for every student and job, then recomputes all
// match scores. Run it after loading the sample data (and whenever you want
// to rebuild every vector):
//   npm run embed:all
// Reads DATABASE_URL from .env.
import { query } from "../src/lib/db";
import { EMBEDDING_MODEL } from "../src/lib/embeddings";
import { rebuildAllEmbeddings } from "../src/lib/matching";

async function main() {
  console.log(`Embedding all students and jobs with ${EMBEDDING_MODEL}...`);
  const started = Date.now();
  const result = await rebuildAllEmbeddings((message) => console.log(message));
  console.log(
    `Done: ${result.students} students and ${result.jobs} jobs embedded in ${((Date.now() - started) / 1000).toFixed(1)} s`,
  );

  // Quick sanity check: each student's best open job.
  const rows = await query<{ full_name: string; title: string; similarity: string; match_score: string }>(
    `SELECT DISTINCT ON (s.student_id) s.full_name, j.title, m.similarity, m.match_score
     FROM match_recommendations m
     JOIN students     s ON s.student_id = m.student_id
     JOIN job_postings j ON j.job_id     = m.job_id
     ORDER BY s.student_id, m.match_score DESC`,
  );
  console.log("\nBest open job for each student:");
  console.table(rows);
  process.exit(0);
}

main().catch((error) => {
  console.error("Embedding failed:", error instanceof Error ? error.message : error);
  process.exit(1);
});
