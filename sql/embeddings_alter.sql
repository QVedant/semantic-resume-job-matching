-- =====================================================================
-- embeddings_alter.sql : Stage 3 schema additions for semantic matching
--
-- The AI model needs the actual TEXT of a resume and of a job to create
-- its 768-number embedding. Stage 2 only stored a resume link and a job
-- title, so this adds:
--   students.resume_text      the resume, as plain text (max 300 words)
--   job_postings.description  the job description       (max 300 words)
-- 300 words is about the most all-mpnet-base-v2 can read in one pass
-- (its limit is 384 tokens).
--
-- Safe to re-run. Run after alter_drop.sql (works before or after seed.sql):
--   psql -U postgres -d placement_db -f sql/embeddings_alter.sql
-- =====================================================================


-- ---------------------------------------------------------------------
-- STORED FUNCTION: word_count(text)
-- Counts the words in a text (runs of characters separated by whitespace).
-- IMMUTABLE = same input always gives the same output, with no table reads.
-- PostgreSQL requires that for any function used inside a CHECK constraint.
-- The website counts words the same way before saving.
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION word_count(p_text TEXT)
RETURNS INT
LANGUAGE sql
IMMUTABLE
AS $$
    SELECT CASE
               WHEN p_text IS NULL OR btrim(p_text) = '' THEN 0
               ELSE array_length(regexp_split_to_array(btrim(p_text), '\s+'), 1)
           END;
$$;


-- ---------------------------------------------------------------------
-- New columns
-- ---------------------------------------------------------------------
ALTER TABLE students
    ADD COLUMN IF NOT EXISTS resume_text TEXT;

ALTER TABLE job_postings
    ADD COLUMN IF NOT EXISTS description TEXT;


-- ---------------------------------------------------------------------
-- 300-word limit, enforced by the database itself.
-- (DROP ... IF EXISTS first, so this file can be run more than once.)
-- ---------------------------------------------------------------------
ALTER TABLE students
    DROP CONSTRAINT IF EXISTS chk_student_resume_words;
ALTER TABLE students
    ADD CONSTRAINT chk_student_resume_words
    CHECK (word_count(resume_text) <= 300);

ALTER TABLE job_postings
    DROP CONSTRAINT IF EXISTS chk_job_description_words;
ALTER TABLE job_postings
    ADD CONSTRAINT chk_job_description_words
    CHECK (word_count(description) <= 300);
