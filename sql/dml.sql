-- =====================================================================
-- dml.sql : INSERT, UPDATE, DELETE, SELECT demonstrations
--
-- Run after seed.sql:
--   psql -U postgres -d placement_db -e -f sql/dml.sql
-- Each change is followed by a SELECT showing its effect.
-- =====================================================================

\pset null '(null)'


-- =====================================================================
-- INSERT
-- =====================================================================

\echo '=== I1. INSERT: register a new student (users row + students row) ==='
-- A data-modifying CTE: the first INSERT creates the login account and
-- RETURNs its new user_id, which the second INSERT uses for the profile.
WITH new_user AS (
    INSERT INTO users (email, password_hash, role)
    VALUES ('ishaan.mehta@pesu.pes.edu', crypt('Password@123', gen_salt('bf', 10)), 'STUDENT')
    RETURNING user_id
)
INSERT INTO students (user_id, usn, full_name, branch, cgpa, grad_year)
SELECT user_id, 'PES2UG23CS210', 'Ishaan Mehta', 'CSE', 8.05, 2027
FROM new_user
RETURNING student_id, usn, full_name, branch, cgpa;

\echo '=== I2. INSERT: add skills to the new student (skill ids looked up by name) ==='
INSERT INTO student_skills (student_id, skill_id, proficiency)
SELECT st.student_id, sk.skill_id, v.proficiency::proficiency_level
FROM (VALUES ('Java',   'ADVANCED'),
             ('SQL',    'INTERMEDIATE'),
             ('Docker', 'BEGINNER')) AS v(skill_name, proficiency)
JOIN skills   sk ON sk.name = v.skill_name
JOIN students st ON st.usn  = 'PES2UG23CS210';

SELECT st.full_name, sk.name AS skill, ss.proficiency
FROM student_skills ss
JOIN students st ON st.student_id = ss.student_id
JOIN skills   sk ON sk.skill_id   = ss.skill_id
WHERE st.usn = 'PES2UG23CS210';


-- =====================================================================
-- UPDATE
-- =====================================================================

\echo '=== U1. UPDATE: recruiter Priya (user 3) shortlists application 2 ==='
SELECT application_id, status, reviewed_by, reviewed_at FROM applications WHERE application_id = 2;

UPDATE applications
SET status      = 'SHORTLISTED',
    reviewed_by = 3,
    reviewed_at = CURRENT_TIMESTAMP
WHERE application_id = 2;

SELECT application_id, status, reviewed_by, reviewed_at FROM applications WHERE application_id = 2;

\echo '=== U2. UPDATE: student Aarav adds a phone number (column added via ALTER) ==='
UPDATE students
SET phone = '9876543210'
WHERE usn = 'PES2UG23CS001'
RETURNING usn, full_name, phone;

\echo '=== U3. UPDATE: recruiter publishes the DRAFT job (job 8) ==='
UPDATE job_postings
SET status = 'OPEN'
WHERE job_id = 8 AND status = 'DRAFT'
RETURNING job_id, title, status, deadline;

\echo '=== U4. UPDATE: auto-close OPEN jobs whose deadline has passed ==='
-- Pushes job 5 into the past first so this has something to close.
UPDATE job_postings SET deadline = CURRENT_DATE - 1 WHERE job_id = 5;

UPDATE job_postings
SET status = 'CLOSED'
WHERE status = 'OPEN' AND deadline < CURRENT_DATE
RETURNING job_id, title, deadline, status;

\echo '=== U5. UPDATE ... FROM: 10% CTC raise on each company''s highest-paying open job ==='
-- UPDATE joined to a subquery: find each company's top CTC and raise it.
UPDATE job_postings jp
SET ctc = ROUND(jp.ctc * 1.10, 2)
FROM (SELECT company_id, MAX(ctc) AS top_ctc
      FROM job_postings
      WHERE status = 'OPEN'
      GROUP BY company_id) top
WHERE jp.company_id = top.company_id
  AND jp.ctc        = top.top_ctc
  AND jp.status     = 'OPEN'
RETURNING jp.job_id, jp.title, jp.ctc;

\echo '=== U6. UPDATE in a transaction: re-embed student 1 (versioned embeddings) ==='
-- Both steps must succeed together, otherwise the student would end up
-- with zero (or two) current embeddings. BEGIN ... COMMIT guarantees that.
BEGIN;
    UPDATE resume_embeddings
    SET is_current = FALSE
    WHERE student_id = 1 AND is_current;

    INSERT INTO resume_embeddings (student_id, embedding, model_name)
    SELECT 1, embedding, 'placeholder-skill-vector-v2'
    FROM resume_embeddings
    WHERE student_id = 1
    ORDER BY created_at DESC
    LIMIT 1;
COMMIT;

SELECT embedding_id, student_id, model_name, is_current
FROM resume_embeddings
WHERE student_id = 1
ORDER BY embedding_id;


-- =====================================================================
-- DELETE
-- =====================================================================

\echo '=== D1. DELETE: Ishaan removes a skill from his profile ==='
DELETE FROM student_skills
WHERE student_id = (SELECT student_id FROM students WHERE usn = 'PES2UG23CS210')
  AND skill_id   = (SELECT skill_id FROM skills WHERE name = 'Docker')
RETURNING *;

\echo '=== D2. DELETE: purge embedding versions that are no longer current ==='
DELETE FROM resume_embeddings
WHERE is_current = FALSE
RETURNING embedding_id, student_id, model_name;

\echo '=== D3. DELETE with ON DELETE CASCADE: delete Ishaan''s account ==='
-- Deleting the users row automatically deletes his students row, which in
-- turn deletes his student_skills rows (both FKs are ON DELETE CASCADE).
SELECT 'before' AS moment,
       (SELECT COUNT(*) FROM users          WHERE email = 'ishaan.mehta@pesu.pes.edu') AS users_rows,
       (SELECT COUNT(*) FROM students       WHERE usn   = 'PES2UG23CS210')             AS student_rows,
       (SELECT COUNT(*) FROM student_skills ss JOIN students s USING (student_id)
         WHERE s.usn = 'PES2UG23CS210')                                                 AS skill_rows;

DELETE FROM users WHERE email = 'ishaan.mehta@pesu.pes.edu';

SELECT 'after' AS moment,
       (SELECT COUNT(*) FROM users          WHERE email = 'ishaan.mehta@pesu.pes.edu') AS users_rows,
       (SELECT COUNT(*) FROM students       WHERE usn   = 'PES2UG23CS210')             AS student_rows,
       (SELECT COUNT(*) FROM student_skills ss JOIN students s USING (student_id)
         WHERE s.usn = 'PES2UG23CS210')                                                 AS skill_rows;


-- =====================================================================
-- SELECT
-- =====================================================================

\echo '=== S1. SELECT with WHERE + ORDER BY: open jobs, highest CTC first ==='
SELECT job_id, title, location, ctc, min_cgpa, deadline
FROM job_postings
WHERE status = 'OPEN'
ORDER BY ctc DESC;

\echo '=== S2. SELECT with pattern matching: students whose name starts with A ==='
SELECT usn, full_name, branch, cgpa
FROM students
WHERE full_name LIKE 'A%'
ORDER BY full_name;

\echo '=== S3. SELECT with BETWEEN + IN: CSE/AIML students with CGPA 8 to 9.5 ==='
SELECT usn, full_name, branch, cgpa
FROM students
WHERE branch IN ('CSE', 'AIML')
  AND cgpa BETWEEN 8.00 AND 9.50
ORDER BY cgpa DESC;
