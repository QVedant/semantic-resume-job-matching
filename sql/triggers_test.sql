-- =====================================================================
-- triggers_test.sql : demonstrates the function, trigger and view
--
--   psql -U postgres -d placement_db -P pager=off -e -f sql/triggers_test.sql
--
-- "Should be rejected" tests are EXPECTED to print an ERROR: that is the
-- trigger blocking an ineligible application, i.e. the test passing.
-- Every test that changes data runs inside BEGIN ... ROLLBACK, so the
-- database is left exactly as it was.
-- =====================================================================

\pset null '(null)'


-- ---------------------------------------------------------------------
-- STORED FUNCTION
-- ---------------------------------------------------------------------

\echo '=== T1. FUNCTION: compute_match_score() reproduces the Stage 2 scores ==='
SELECT m.student_id,
       m.job_id,
       m.match_score                                AS stored_in_stage2,
       compute_match_score(m.student_id, m.job_id)  AS computed_by_function
FROM match_recommendations m
WHERE (m.student_id, m.job_id) IN ((1, 1), (2, 3), (6, 4), (9, 4))
ORDER BY m.match_score DESC;

\echo '=== T2. FUNCTION: returns NULL when a job has no embedding (job 999 does not exist) ==='
SELECT compute_match_score(1, 999) AS score;


-- ---------------------------------------------------------------------
-- TRIGGER: accepted application
-- ---------------------------------------------------------------------

\echo '=== T3. TRIGGER accepts an eligible application and stamps the real score ==='
-- Sneha (student 4, CSE, CGPA 7.35) applies to Cloud Support Associate
-- (job 2: OPEN, min CGPA 6.50, branches CSE,ISE,ECE,EEE).
-- We try to sneak in a fake score of 0.9999; the trigger overwrites it.
BEGIN;
    INSERT INTO applications (student_id, job_id, match_score)
    VALUES (4, 2, 0.9999)
    RETURNING application_id, student_id, job_id, status, match_score;

    SELECT compute_match_score(4, 2) AS score_from_function;
ROLLBACK;


-- ---------------------------------------------------------------------
-- TRIGGER: rejected applications (each prints an ERROR on purpose)
-- ---------------------------------------------------------------------

\echo '=== T4. TRIGGER rejects: CGPA too low (Sneha 7.35 < 7.50 for job 1) ==='
INSERT INTO applications (student_id, job_id) VALUES (4, 1);

\echo '=== T5. TRIGGER rejects: branch not eligible (Vikram, ME, for job 4) ==='
INSERT INTO applications (student_id, job_id) VALUES (9, 4);

\echo '=== T6. TRIGGER rejects: job is CLOSED (job 7) ==='
INSERT INTO applications (student_id, job_id) VALUES (4, 7);

\echo '=== T7. TRIGGER rejects: job is still a DRAFT ==='
BEGIN;
    UPDATE job_postings SET status = 'DRAFT' WHERE job_id = 2;
    INSERT INTO applications (student_id, job_id) VALUES (4, 2);
ROLLBACK;

\echo '=== T8. TRIGGER rejects: deadline has passed ==='
BEGIN;
    UPDATE job_postings SET deadline = CURRENT_DATE - 1 WHERE job_id = 2;
    INSERT INTO applications (student_id, job_id) VALUES (4, 2);
ROLLBACK;


-- ---------------------------------------------------------------------
-- TRANSACTION + TRIGGER: all-or-nothing
-- ---------------------------------------------------------------------

\echo '=== T9. TRANSACTION: one valid + one invalid insert -> NEITHER is saved ==='
-- The first INSERT succeeds, the second is rejected by the trigger.
-- Because they are in one transaction, COMMIT turns into ROLLBACK and
-- the first application disappears too.
BEGIN;
    INSERT INTO applications (student_id, job_id) VALUES (4, 2);   -- valid
    INSERT INTO applications (student_id, job_id) VALUES (4, 1);   -- CGPA too low
COMMIT;

SELECT COUNT(*) AS sneha_applications_saved
FROM applications
WHERE student_id = 4;


-- ---------------------------------------------------------------------
-- VIEW
-- ---------------------------------------------------------------------

\echo '=== T10. VIEW: vw_application_overview reads like one flat table ==='
SELECT application_id, student_name, branch, job_title, company_name,
       status, match_score, rounds_passed, total_rounds, reviewed_by_email
FROM vw_application_overview
ORDER BY application_id;

\echo '=== T11. VIEW used for a dashboard statistic: applications per company by status ==='
SELECT company_name,
       COUNT(*)                                                 AS applications,
       COUNT(*) FILTER (WHERE status = 'SHORTLISTED')           AS shortlisted,
       COUNT(*) FILTER (WHERE status IN ('OFFERED', 'HIRED'))   AS offers,
       ROUND(AVG(match_score), 4)                               AS avg_match_score
FROM vw_application_overview
GROUP BY company_name
ORDER BY applications DESC, company_name;
