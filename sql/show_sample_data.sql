-- =====================================================================
-- show_sample_data.sql : display the rows inserted by seed.sql
-- (execution evidence for section 7.2 Sample Data)
--
--   psql -U postgres -d placement_db -P pager=off -e -f sql/show_sample_data.sql
-- =====================================================================

\pset null '(null)'

\echo '=== users (password_hash shortened: it is a bcrypt hash, not the password) ==='
SELECT user_id, email, role, LEFT(password_hash, 20) || '...' AS password_hash, created_at
FROM users ORDER BY user_id;

\echo '=== companies ==='
SELECT * FROM companies ORDER BY company_id;

\echo '=== placement_officers ==='
SELECT * FROM placement_officers ORDER BY officer_id;

\echo '=== recruiters ==='
SELECT * FROM recruiters ORDER BY recruiter_id;

\echo '=== students ==='
SELECT student_id, user_id, usn, full_name, branch, cgpa, grad_year, phone
FROM students ORDER BY student_id;

\echo '=== skills ==='
SELECT * FROM skills ORDER BY skill_id;

\echo '=== student_skills ==='
SELECT * FROM student_skills ORDER BY student_id, skill_id;

\echo '=== job_postings ==='
SELECT job_id, company_id, posted_by, title, location, ctc, min_cgpa, eligible_branches, deadline, status
FROM job_postings ORDER BY job_id;

\echo '=== job_skills ==='
SELECT * FROM job_skills ORDER BY job_id, skill_id;

\echo '=== interview_rounds ==='
SELECT * FROM interview_rounds ORDER BY round_id;

\echo '=== resume_embeddings (each vector has 768 numbers; only the first few are shown) ==='
SELECT embedding_id, student_id, vector_dims(embedding) AS dims,
       LEFT(embedding::text, 50) || '...' AS embedding_preview, model_name, is_current
FROM resume_embeddings ORDER BY embedding_id;

\echo '=== job_embeddings ==='
SELECT embedding_id, job_id, vector_dims(embedding) AS dims,
       LEFT(embedding::text, 50) || '...' AS embedding_preview, model_name, is_current
FROM job_embeddings ORDER BY embedding_id;

\echo '=== match_recommendations (top 15 of 60, best matches first) ==='
SELECT rec_id, student_id, job_id, similarity, match_score
FROM match_recommendations ORDER BY match_score DESC LIMIT 15;

\echo '=== applications ==='
SELECT application_id, student_id, job_id, reviewed_by, status, match_score,
       applied_at::date AS applied_on, reviewed_at::date AS reviewed_on
FROM applications ORDER BY application_id;

\echo '=== application_rounds ==='
SELECT ar_id, application_id, round_id, result, scheduled_at::date AS scheduled_on, feedback
FROM application_rounds ORDER BY ar_id;
