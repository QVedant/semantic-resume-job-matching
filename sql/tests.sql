-- =====================================================================
-- tests.sql : Stage 2 test cases (report section 8)
--
--   psql -U postgres -d placement_db -e -f sql/tests.sql
--
-- "Should fail" tests are EXPECTED to print an ERROR: that error is the
-- database enforcing its constraint, i.e. the test passing.
-- Tests that do change data run inside BEGIN ... ROLLBACK, so running
-- this file leaves the database exactly as it was.
-- =====================================================================

\pset null '(null)'


\echo '=== TC01. Insert valid record -> expected: record inserted ==='
BEGIN;
    INSERT INTO skills (name, category) VALUES ('Rust', 'Programming Language')
    RETURNING *;
ROLLBACK;


\echo '=== TC02. Insert duplicate primary key -> expected: rejected (skills_pkey) ==='
INSERT INTO skills (skill_id, name, category) VALUES (1, 'Go', 'Programming Language');


\echo '=== TC03. Execute JOIN query -> expected: correct records (Rohan, ML Engineer, OFFERED) ==='
SELECT s.full_name, j.title, c.name AS company, a.status
FROM applications a
JOIN students     s ON s.student_id = a.student_id
JOIN job_postings j ON j.job_id     = a.job_id
JOIN companies    c ON c.company_id = j.company_id
WHERE a.status = 'OFFERED';


\echo '=== TC04. CHECK constraint: CGPA of 11.5 -> expected: rejected (chk_student_cgpa) ==='
UPDATE students SET cgpa = 11.5 WHERE student_id = 1;


\echo '=== TC05. UNIQUE constraint: apply twice to the same job -> expected: rejected (uq_app_student_job) ==='
INSERT INTO applications (student_id, job_id) VALUES (1, 1);


\echo '=== TC06. FOREIGN KEY: application to a job that does not exist -> expected: rejected (fk_app_job) ==='
INSERT INTO applications (student_id, job_id) VALUES (1, 999);


\echo '=== TC07. ENUM type: invalid application status -> expected: rejected (invalid input value for enum) ==='
UPDATE applications SET status = 'PENDING' WHERE application_id = 1;


\echo '=== TC08. NOT NULL: user without an email -> expected: rejected ==='
INSERT INTO users (password_hash, role) VALUES ('x', 'STUDENT');


\echo '=== TC09. Vector dimension: a 3-dim vector into vector(768) -> expected: rejected ==='
INSERT INTO resume_embeddings (student_id, embedding) VALUES (1, '[0.1, 0.2, 0.3]');


\echo '=== TC10. ON DELETE SET NULL: delete reviewer Suresh (user 2) -> expected: application 10 kept, reviewed_by becomes NULL ==='
BEGIN;
    SELECT application_id, status, reviewed_by FROM applications WHERE application_id = 10;
    DELETE FROM users WHERE user_id = 2;
    SELECT application_id, status, reviewed_by FROM applications WHERE application_id = 10;
ROLLBACK;
