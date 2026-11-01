-- =====================================================================
-- inspect_schema.sql : show the structure created by schema.sql
-- (execution evidence for DDL: extensions, ENUM types, tables, indexes)
--
--   psql -U postgres -d placement_db -P pager=off -f sql/inspect_schema.sql
-- =====================================================================

\echo '=== Installed extensions (vector = pgvector, pgcrypto = password hashing) ==='
\dx

\echo '=== ENUM types and their allowed values ==='
SELECT t.typname AS enum_type,
       string_agg(e.enumlabel, ', ' ORDER BY e.enumsortorder) AS allowed_values
FROM pg_type t
JOIN pg_enum e ON e.enumtypid = t.oid
GROUP BY t.typname
ORDER BY t.typname;

\echo '=== All tables ==='
\dt

\echo '=== Table: users ==='
\d users
\echo '=== Table: companies ==='
\d companies
\echo '=== Table: students ==='
\d students
\echo '=== Table: placement_officers ==='
\d placement_officers
\echo '=== Table: recruiters ==='
\d recruiters
\echo '=== Table: skills ==='
\d skills
\echo '=== Table: student_skills ==='
\d student_skills
\echo '=== Table: job_postings ==='
\d job_postings
\echo '=== Table: job_skills ==='
\d job_skills
\echo '=== Table: resume_embeddings ==='
\d resume_embeddings
\echo '=== Table: job_embeddings ==='
\d job_embeddings
\echo '=== Table: match_recommendations ==='
\d match_recommendations
\echo '=== Table: applications ==='
\d applications
\echo '=== Table: interview_rounds ==='
\d interview_rounds
\echo '=== Table: application_rounds ==='
\d application_rounds

\echo '=== All indexes (B-tree + HNSW) ==='
\di
