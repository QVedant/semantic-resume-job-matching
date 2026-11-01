-- =====================================================================
-- queries.sql : advanced SQL queries
-- JOIN, GROUP BY, HAVING, ORDER BY, aggregates, subqueries,
-- plus pgvector similarity search.
--
--   psql -U postgres -d placement_db -e -f sql/queries.sql
-- =====================================================================

\pset null '(null)'


\echo '=== Q1. INNER JOIN (4 tables): every application with student, job and company ==='
SELECT a.application_id,
       s.full_name  AS student,
       j.title      AS job,
       c.name       AS company,
       a.status,
       a.match_score
FROM applications a
JOIN students     s ON s.student_id = a.student_id
JOIN job_postings j ON j.job_id     = a.job_id
JOIN companies    c ON c.company_id = j.company_id
ORDER BY a.application_id;


\echo '=== Q2. LEFT JOIN + GROUP BY: jobs posted per company (including companies with none) ==='
SELECT c.name                    AS company,
       c.industry,
       COUNT(j.job_id)           AS jobs_posted,
       COALESCE(MAX(j.ctc), 0)   AS highest_ctc
FROM companies c
LEFT JOIN job_postings j ON j.company_id = c.company_id
GROUP BY c.company_id, c.name, c.industry
ORDER BY jobs_posted DESC, company;


\echo '=== Q3. GROUP BY + aggregates: applicant statistics per job ==='
SELECT j.title,
       COUNT(a.application_id)     AS applicants,
       ROUND(AVG(s.cgpa), 2)       AS avg_cgpa,
       MIN(s.cgpa)                 AS min_cgpa,
       MAX(a.match_score)          AS best_match_score
FROM job_postings j
JOIN applications a ON a.job_id     = j.job_id
JOIN students     s ON s.student_id = a.student_id
GROUP BY j.job_id, j.title
ORDER BY applicants DESC, j.title;


\echo '=== Q4. GROUP BY + HAVING: jobs that attracted 2 or more applicants ==='
SELECT j.job_id, j.title, COUNT(*) AS applicants
FROM job_postings j
JOIN applications a ON a.job_id = j.job_id
GROUP BY j.job_id, j.title
HAVING COUNT(*) >= 2
ORDER BY applicants DESC;


\echo '=== Q5. HAVING on an aggregate: companies whose average offered CTC exceeds 12 LPA ==='
SELECT c.name AS company,
       COUNT(j.job_id)       AS jobs,
       ROUND(AVG(j.ctc), 2)  AS avg_ctc
FROM companies c
JOIN job_postings j ON j.company_id = c.company_id
GROUP BY c.company_id, c.name
HAVING AVG(j.ctc) > 1200000
ORDER BY avg_ctc DESC;


\echo '=== Q6. Conditional aggregation: placement report per branch ==='
-- COUNT(DISTINCT ...) FILTER (WHERE ...) counts only rows meeting a condition.
SELECT s.branch,
       COUNT(DISTINCT s.student_id)                                         AS students,
       COUNT(DISTINCT a.student_id)                                         AS applied,
       COUNT(DISTINCT a.student_id) FILTER (WHERE a.status IN ('OFFERED', 'HIRED')) AS placed,
       ROUND(100.0 * COUNT(DISTINCT a.student_id) FILTER (WHERE a.status IN ('OFFERED', 'HIRED'))
             / COUNT(DISTINCT s.student_id), 1)                             AS placement_pct
FROM students s
LEFT JOIN applications a ON a.student_id = s.student_id
GROUP BY s.branch
ORDER BY placement_pct DESC, s.branch;


\echo '=== Q7. Subquery with NOT EXISTS: students who have not applied anywhere ==='
SELECT s.usn, s.full_name, s.branch, s.cgpa
FROM students s
WHERE NOT EXISTS (
    SELECT 1 FROM applications a WHERE a.student_id = s.student_id
);


\echo '=== Q8. Scalar subquery: students with CGPA above the batch average ==='
SELECT s.usn, s.full_name, s.cgpa,
       (SELECT ROUND(AVG(cgpa), 2) FROM students) AS batch_avg
FROM students s
WHERE s.cgpa > (SELECT AVG(cgpa) FROM students)
ORDER BY s.cgpa DESC;


\echo '=== Q9. Correlated subquery: best-matching applicant for each job ==='
SELECT j.title,
       s.full_name AS top_applicant,
       a.match_score
FROM applications a
JOIN job_postings j ON j.job_id     = a.job_id
JOIN students     s ON s.student_id = a.student_id
WHERE a.match_score = (
    SELECT MAX(a2.match_score)
    FROM applications a2
    WHERE a2.job_id = a.job_id      -- refers to the outer row: re-evaluated per job
)
ORDER BY a.match_score DESC;


\echo '=== Q10. Eligibility check: students eligible for job 1 (CGPA + branch rule) ==='
-- string_to_array turns 'CSE,ISE,AIML' into {CSE,ISE,AIML}; = ANY tests membership.
SELECT s.usn, s.full_name, s.branch, s.cgpa, j.min_cgpa, j.eligible_branches
FROM students s
CROSS JOIN job_postings j
WHERE j.job_id = 1
  AND s.cgpa  >= j.min_cgpa
  AND s.branch = ANY (string_to_array(j.eligible_branches, ','))
ORDER BY s.cgpa DESC;


\echo '=== Q11. Skill-gap analysis (EXCEPT): skills job 1 needs that Ananya (student 10) lacks ==='
SELECT sk.name AS missing_skill, js.weight AS importance
FROM job_skills js
JOIN skills sk ON sk.skill_id = js.skill_id
WHERE js.job_id = 1
  AND js.skill_id IN (
        SELECT skill_id FROM job_skills     WHERE job_id = 1
        EXCEPT
        SELECT skill_id FROM student_skills WHERE student_id = 10
  )
ORDER BY js.weight DESC;


\echo '=== Q12. Skill demand vs supply: required by open jobs vs held by students ==='
SELECT sk.name,
       sk.category,
       (SELECT COUNT(*) FROM job_skills js JOIN job_postings j ON j.job_id = js.job_id
         WHERE js.skill_id = sk.skill_id AND j.status = 'OPEN')        AS open_jobs_needing,
       (SELECT COUNT(*) FROM student_skills ss WHERE ss.skill_id = sk.skill_id) AS students_having
FROM skills sk
ORDER BY open_jobs_needing DESC, students_having ASC;


\echo '=== Q13. Interview funnel: results per round for the ML Engineer job ==='
SELECT ir.round_no,
       ir.round_name,
       ir.round_type,
       COUNT(ar.ar_id)                                   AS candidates,
       COUNT(*) FILTER (WHERE ar.result = 'PASSED')      AS passed,
       COUNT(*) FILTER (WHERE ar.result = 'PENDING')     AS pending,
       COUNT(*) FILTER (WHERE ar.result = 'REJECTED')    AS rejected
FROM interview_rounds ir
LEFT JOIN application_rounds ar ON ar.round_id = ir.round_id
WHERE ir.job_id = 3
GROUP BY ir.round_id, ir.round_no, ir.round_name, ir.round_type
ORDER BY ir.round_no;


\echo '=== Q14. Vector similarity search: top 3 jobs for Aarav (student 1) by cosine similarity ==='
-- <=> is pgvector's cosine distance; smallest distance = most similar.
-- ORDER BY embedding <=> query LIMIT k is the shape the HNSW index accelerates.
SELECT j.job_id,
       j.title,
       c.name AS company,
       ROUND((1 - (je.embedding <=> r.embedding))::numeric, 4) AS cosine_similarity
FROM resume_embeddings r
JOIN job_embeddings je ON je.is_current
JOIN job_postings   j  ON j.job_id     = je.job_id
JOIN companies      c  ON c.company_id = j.company_id
WHERE r.student_id = 1
  AND r.is_current
  AND j.status = 'OPEN'
ORDER BY je.embedding <=> r.embedding
LIMIT 3;


\echo '=== Q15. Vector similarity search: 3 students whose profiles are closest to job 3 ==='
SELECT s.full_name,
       s.branch,
       ROUND((1 - (r.embedding <=> je.embedding))::numeric, 4) AS cosine_similarity
FROM job_embeddings je
JOIN resume_embeddings r ON r.is_current
JOIN students          s ON s.student_id = r.student_id
WHERE je.job_id = 3
  AND je.is_current
ORDER BY r.embedding <=> je.embedding
LIMIT 3;


\echo '=== Q16. Hybrid search: semantic rank + relational eligibility, for Meera (student 6) ==='
-- Only jobs she is actually eligible for and has not applied to, ranked by match_score.
SELECT j.title,
       c.name AS company,
       j.ctc,
       m.similarity,
       m.match_score
FROM match_recommendations m
JOIN job_postings j ON j.job_id     = m.job_id
JOIN companies    c ON c.company_id = j.company_id
JOIN students     s ON s.student_id = m.student_id
WHERE m.student_id = 6
  AND j.status = 'OPEN'
  AND s.cgpa  >= j.min_cgpa
  AND s.branch = ANY (string_to_array(j.eligible_branches, ','))
  AND m.job_id NOT IN (SELECT job_id FROM applications WHERE student_id = 6)
ORDER BY m.match_score DESC;
