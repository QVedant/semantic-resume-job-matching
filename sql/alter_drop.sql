-- =====================================================================
-- alter_drop.sql : ALTER and DROP demonstrations
--
-- Run once, right after schema.sql and before seed.sql:
--   psql -U postgres -d placement_db -e -f sql/alter_drop.sql
-- (-e prints each statement above its result, which is what you want
--  in the execution-evidence screenshots.)
-- =====================================================================

\echo '=== A1. ADD COLUMN: students get an optional phone number ==='
ALTER TABLE students
    ADD COLUMN phone VARCHAR(10);

\echo '=== A2. ADD CONSTRAINT: phone must be a 10-digit Indian mobile number ==='
ALTER TABLE students
    ADD CONSTRAINT chk_student_phone
    CHECK (phone IS NULL OR phone ~ '^[6-9][0-9]{9}$');

\echo '=== A3. SET NOT NULL: branch is required (eligibility checks depend on it) ==='
ALTER TABLE students
    ALTER COLUMN branch SET NOT NULL;

\echo '=== A4. ADD CONSTRAINT: graduation year must be realistic ==='
ALTER TABLE students
    ADD CONSTRAINT chk_student_grad_year
    CHECK (grad_year IS NULL OR grad_year BETWEEN 2000 AND 2100);

\echo '=== A5. ADD CONSTRAINT: an application cannot be reviewed before it was submitted ==='
ALTER TABLE applications
    ADD CONSTRAINT chk_app_review_after_apply
    CHECK (reviewed_at IS NULL OR reviewed_at >= applied_at);

\echo '=== A6. SET DEFAULT: most campus jobs are in Bengaluru ==='
ALTER TABLE job_postings
    ALTER COLUMN location SET DEFAULT 'Bengaluru';

\echo '=== D1. DROP INDEX + CREATE INDEX: replace the single-column status index ==='
-- Students browse "open jobs whose deadline has not passed", i.e.
--   WHERE status = 'OPEN' AND deadline >= CURRENT_DATE
-- A composite (status, deadline) index serves that whole condition, and
-- it still serves queries on status alone (leftmost column), so the old
-- single-column index is now redundant and is dropped.
DROP INDEX IF EXISTS idx_job_postings_status;

CREATE INDEX idx_job_postings_status_deadline
    ON job_postings(status, deadline);

\echo '=== Result: students table after ALTER ==='
\d students
\echo '=== Result: indexes on job_postings after DROP/CREATE ==='
\d job_postings
