// Semantic matching: stores embeddings and keeps match scores up to date.
// Server-side only. The AI model (lib/embeddings.ts) only turns text into
// vectors; all comparing and ranking happens inside PostgreSQL (pgvector).
import type { PoolClient } from "pg";
import { query, toVector, withTransaction } from "@/lib/db";
import { EMBEDDING_MODEL_NAME, embedText } from "@/lib/embeddings";

// ---------------------------------------------------------------------
// What text gets embedded
// ---------------------------------------------------------------------

// A student's resume text. If they have not written one yet, a sentence built
// from their skills is used instead, so every student still gets a vector.
export async function studentEmbeddingText(studentId: number): Promise<string | null> {
  const [row] = await query<{ resume_text: string | null; skills: string | null }>(
    `SELECT s.resume_text,
            string_agg(sk.name || ' (' || lower(ss.proficiency::text) || ')', ', ' ORDER BY sk.name) AS skills
     FROM students s
     LEFT JOIN student_skills ss ON ss.student_id = s.student_id
     LEFT JOIN skills         sk ON sk.skill_id   = ss.skill_id
     WHERE s.student_id = $1
     GROUP BY s.student_id, s.resume_text`,
    [studentId],
  );
  if (!row) return null;
  if (row.resume_text?.trim()) return row.resume_text;
  return row.skills ? `Skills: ${row.skills}.` : null;
}

// A job's title + description + required skills.
export async function jobEmbeddingText(jobId: number): Promise<string | null> {
  const [row] = await query<{ title: string; description: string | null; skills: string | null }>(
    `SELECT j.title, j.description,
            string_agg(sk.name, ', ' ORDER BY js.weight DESC) AS skills
     FROM job_postings j
     LEFT JOIN job_skills js ON js.job_id   = j.job_id
     LEFT JOIN skills     sk ON sk.skill_id = js.skill_id
     WHERE j.job_id = $1
     GROUP BY j.job_id, j.title, j.description`,
    [jobId],
  );
  if (!row) return null;
  return [row.title + ".", row.description?.trim(), row.skills ? `Required skills: ${row.skills}.` : null]
    .filter(Boolean)
    .join(" ");
}

// ---------------------------------------------------------------------
// Saving vectors (versioned: old rows are kept with is_current = FALSE)
// ---------------------------------------------------------------------

export async function saveStudentEmbedding(client: PoolClient, studentId: number, vector: number[]) {
  await client.query(
    `UPDATE resume_embeddings SET is_current = FALSE WHERE student_id = $1 AND is_current`,
    [studentId],
  );
  await client.query(
    `INSERT INTO resume_embeddings (student_id, embedding, model_name) VALUES ($1, $2::vector, $3)`,
    [studentId, toVector(vector), EMBEDDING_MODEL_NAME],
  );
}

export async function saveJobEmbedding(client: PoolClient, jobId: number, vector: number[]) {
  await client.query(
    `UPDATE job_embeddings SET is_current = FALSE WHERE job_id = $1 AND is_current`,
    [jobId],
  );
  await client.query(
    `INSERT INTO job_embeddings (job_id, embedding, model_name) VALUES ($1, $2::vector, $3)`,
    [jobId, toVector(vector), EMBEDDING_MODEL_NAME],
  );
}

// ---------------------------------------------------------------------
// Recomputing match scores
// match_recommendations holds one row per (student, OPEN job). The score
// itself comes from the stored function compute_match_score() (triggers.sql),
// so the formula lives in exactly one place: the database.
// ---------------------------------------------------------------------

const RECOMMENDATION_ROWS = `
  SELECT r.student_id,
         j.job_id,
         ROUND(GREATEST(0, 1 - (r.embedding <=> je.embedding))::numeric, 4) AS similarity,
         compute_match_score(r.student_id, j.job_id)                        AS match_score
  FROM resume_embeddings r
  JOIN job_embeddings je ON je.is_current
  JOIN job_postings   j  ON j.job_id = je.job_id AND j.status = 'OPEN'
  WHERE r.is_current`;

export async function refreshStudentMatches(client: PoolClient, studentId: number) {
  await client.query(`DELETE FROM match_recommendations WHERE student_id = $1`, [studentId]);
  await client.query(
    `INSERT INTO match_recommendations (student_id, job_id, similarity, match_score)
     ${RECOMMENDATION_ROWS} AND r.student_id = $1`,
    [studentId],
  );
  // Keep the scores on this student's existing applications in step too, so
  // recruiters always rank applicants by the latest resume.
  await client.query(
    `UPDATE applications SET match_score = compute_match_score(student_id, job_id) WHERE student_id = $1`,
    [studentId],
  );
}

export async function refreshJobMatches(client: PoolClient, jobId: number) {
  await client.query(`DELETE FROM match_recommendations WHERE job_id = $1`, [jobId]);
  await client.query(
    `INSERT INTO match_recommendations (student_id, job_id, similarity, match_score)
     ${RECOMMENDATION_ROWS} AND j.job_id = $1`,
    [jobId],
  );
  await client.query(
    `UPDATE applications SET match_score = compute_match_score(student_id, job_id) WHERE job_id = $1`,
    [jobId],
  );
}

// ---------------------------------------------------------------------
// High-level operations used by API routes and scripts
// ---------------------------------------------------------------------

// Saves a student's new resume text and its embedding, and refreshes their
// matches. The model runs first (it takes ~1 s), then ONE transaction does all
// the writes, so the text, the vector and the scores can never get out of sync.
export async function updateStudentResume(studentId: number, resumeText: string) {
  const vector = await embedText(resumeText);
  await withTransaction(async (client) => {
    await client.query(`UPDATE students SET resume_text = $1 WHERE student_id = $2`, [resumeText, studentId]);
    await saveStudentEmbedding(client, studentId, vector);
    await refreshStudentMatches(client, studentId);
  });
}

// (Re)embeds one job, e.g. right after a recruiter posts or edits it.
export async function embedJob(jobId: number) {
  const text = await jobEmbeddingText(jobId);
  if (!text) throw new Error(`Job ${jobId} not found.`);
  const vector = await embedText(text);
  await withTransaction(async (client) => {
    await saveJobEmbedding(client, jobId, vector);
    await refreshJobMatches(client, jobId);
  });
}

// Re-embeds every student and job with the real model, then recomputes all
// match scores. Used by `npm run embed:all` (replaces the Stage 2 placeholder
// vectors). Embedding happens first; all database writes are one transaction.
export async function rebuildAllEmbeddings(log: (message: string) => void = () => {}) {
  const students = await query<{ student_id: number; full_name: string }>(
    `SELECT student_id, full_name FROM students ORDER BY student_id`,
  );
  const jobs = await query<{ job_id: number; title: string }>(
    `SELECT job_id, title FROM job_postings ORDER BY job_id`,
  );

  const studentVectors: { id: number; vector: number[] }[] = [];
  for (const s of students) {
    const text = await studentEmbeddingText(s.student_id);
    if (!text) {
      log(`  skipped student ${s.student_id} ${s.full_name}: no resume text or skills`);
      continue;
    }
    studentVectors.push({ id: s.student_id, vector: await embedText(text) });
    log(`  embedded student ${s.student_id} ${s.full_name}`);
  }

  const jobVectors: { id: number; vector: number[] }[] = [];
  for (const j of jobs) {
    const text = await jobEmbeddingText(j.job_id);
    if (!text) continue;
    jobVectors.push({ id: j.job_id, vector: await embedText(text) });
    log(`  embedded job ${j.job_id} ${j.title}`);
  }

  await withTransaction(async (client) => {
    for (const s of studentVectors) await saveStudentEmbedding(client, s.id, s.vector);
    for (const j of jobVectors) await saveJobEmbedding(client, j.id, j.vector);

    await client.query(`DELETE FROM match_recommendations`);
    await client.query(
      `INSERT INTO match_recommendations (student_id, job_id, similarity, match_score) ${RECOMMENDATION_ROWS}`,
    );
    await client.query(`UPDATE applications SET match_score = compute_match_score(student_id, job_id)`);
  });

  return { students: studentVectors.length, jobs: jobVectors.length };
}
