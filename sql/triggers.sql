-- =====================================================================
-- triggers.sql : Stage 3 advanced database features
--   1. Stored function  compute_match_score(student_id, job_id)
--   2. Trigger          trg_check_eligibility  (BEFORE INSERT on applications)
--   3. View             vw_application_overview
--
-- Safe to re-run (CREATE OR REPLACE / DROP ... IF EXISTS).
-- Run after schema.sql + alter_drop.sql. It works before or after seed.sql:
--   psql -U postgres -d placement_db -f sql/triggers.sql
-- =====================================================================


-- ---------------------------------------------------------------------
-- 1. STORED FUNCTION: compute_match_score
--
-- Returns how well a student fits a job, from 0 (no fit) to 1 (perfect),
-- using the same formula as the Stage 2 seed data:
--     similarity  = 1 - cosine distance between the two current vectors,
--                   clamped at 0 (<=> is pgvector's cosine distance)
--     match_score = 0.8 * similarity + 0.2 * (cgpa / 10)
-- Returns NULL if the student or the job has no current embedding yet.
--
-- STABLE tells PostgreSQL the function only reads data and gives the same
-- answer for the same inputs within one statement.
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION compute_match_score(p_student_id INT, p_job_id INT)
RETURNS DECIMAL(5,4)
LANGUAGE sql
STABLE
AS $$
    SELECT ROUND((0.8 * GREATEST(0, 1 - (r.embedding <=> j.embedding))
                + 0.2 * COALESCE(s.cgpa, 0) / 10)::numeric, 4)
    FROM resume_embeddings r
    JOIN students       s ON s.student_id = r.student_id
    JOIN job_embeddings j ON j.job_id     = p_job_id AND j.is_current
    WHERE r.student_id = p_student_id
      AND r.is_current
    ORDER BY r.created_at DESC, j.created_at DESC
    LIMIT 1;
$$;


-- ---------------------------------------------------------------------
-- 2. TRIGGER: eligibility check on every new application
--
-- Fires automatically BEFORE each row is inserted into applications.
-- It enforces the placement rules inside the database, so they hold even
-- if the website has a bug or someone inserts rows with plain SQL:
--     a) the job must be OPEN
--     b) the deadline must not have passed
--     c) the student's CGPA must be >= the job's min_cgpa
--     d) the student's branch must be in the job's eligible_branches
-- If a rule fails, RAISE EXCEPTION aborts the INSERT. Inside a transaction,
-- that makes the whole transaction roll back.
-- If all rules pass, it stamps the match score on the new row, so the
-- score always comes from the database, not from user input.
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION check_application_eligibility()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    v_job     job_postings%ROWTYPE;   -- the whole job row
    v_student students%ROWTYPE;       -- the whole student row
BEGIN
    SELECT * INTO v_job     FROM job_postings WHERE job_id     = NEW.job_id;
    SELECT * INTO v_student FROM students     WHERE student_id = NEW.student_id;

    -- Unknown job or student: let the FOREIGN KEY constraint report it.
    IF v_job.job_id IS NULL OR v_student.student_id IS NULL THEN
        RETURN NEW;
    END IF;

    -- a) job must be open
    IF v_job.status <> 'OPEN' THEN
        RAISE EXCEPTION 'Not eligible: job "%" is not open for applications (status %)',
            v_job.title, v_job.status;
    END IF;

    -- b) deadline must not have passed
    IF v_job.deadline IS NOT NULL AND v_job.deadline < CURRENT_DATE THEN
        RAISE EXCEPTION 'Not eligible: the deadline for "%" was %',
            v_job.title, v_job.deadline;
    END IF;

    -- c) CGPA requirement (a NULL min_cgpa means no requirement)
    IF v_job.min_cgpa IS NOT NULL
       AND (v_student.cgpa IS NULL OR v_student.cgpa < v_job.min_cgpa) THEN
        RAISE EXCEPTION 'Not eligible: CGPA % is below the minimum % for "%"',
            COALESCE(v_student.cgpa::text, 'not set'), v_job.min_cgpa, v_job.title;
    END IF;

    -- d) branch requirement (a NULL list means all branches are allowed)
    --    'CSE, ISE,AIML' -> {CSE,ISE,AIML}  (spaces removed, then split on commas)
    IF v_job.eligible_branches IS NOT NULL
       AND NOT (v_student.branch = ANY (
                    string_to_array(replace(v_job.eligible_branches, ' ', ''), ','))) THEN
        RAISE EXCEPTION 'Not eligible: branch % is not in the eligible branches (%) for "%"',
            v_student.branch, v_job.eligible_branches, v_job.title;
    END IF;

    -- All rules passed: stamp the score computed by the stored function.
    NEW.match_score := compute_match_score(NEW.student_id, NEW.job_id);

    RETURN NEW;   -- returning NEW lets the INSERT go ahead with the updated row
END;
$$;

DROP TRIGGER IF EXISTS trg_check_eligibility ON applications;

CREATE TRIGGER trg_check_eligibility
    BEFORE INSERT ON applications
    FOR EACH ROW
    EXECUTE FUNCTION check_application_eligibility();


-- ---------------------------------------------------------------------
-- 3. VIEW: vw_application_overview
--
-- A saved query that looks like one flat table: every application with
-- its student, job, company, reviewer and interview progress. The
-- placement officer dashboard reads from it instead of repeating this
-- 5-table join everywhere.
-- ---------------------------------------------------------------------
DROP VIEW IF EXISTS vw_application_overview;

CREATE VIEW vw_application_overview AS
SELECT a.application_id,
       a.status,
       a.match_score,
       a.applied_at,
       a.reviewed_at,
       s.student_id,
       s.usn,
       s.full_name   AS student_name,
       s.branch,
       s.cgpa,
       j.job_id,
       j.title       AS job_title,
       j.location,
       j.ctc,
       j.status      AS job_status,
       j.deadline,
       c.company_id,
       c.name        AS company_name,
       u.email       AS reviewed_by_email,
       (SELECT COUNT(*) FROM application_rounds ar
         WHERE ar.application_id = a.application_id
           AND ar.result = 'PASSED')                    AS rounds_passed,
       (SELECT COUNT(*) FROM interview_rounds ir
         WHERE ir.job_id = a.job_id)                    AS total_rounds
FROM applications a
JOIN students     s ON s.student_id = a.student_id
JOIN job_postings j ON j.job_id     = a.job_id
JOIN companies    c ON c.company_id = j.company_id
LEFT JOIN users   u ON u.user_id    = a.reviewed_by;   -- LEFT: not every application is reviewed yet
