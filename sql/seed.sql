-- =====================================================================
-- seed.sql : sample data
--
-- Run right after schema.sql + alter_drop.sql (fresh tables), because the
-- IDs referenced below assume SERIAL counters start at 1:
--   psql -U postgres -d placement_db -f sql/seed.sql
--
-- Every demo account's password is  Password@123
-- It is stored as a bcrypt hash via pgcrypto, never as plain text.
-- =====================================================================


-- ---------------------------------------------------------------------
-- USERS (16): 2 placement officers, 4 recruiters, 10 students
-- ---------------------------------------------------------------------
INSERT INTO users (email, password_hash, role) VALUES
    ('anita.rao@pes.edu',            crypt('Password@123', gen_salt('bf', 10)), 'PLACEMENT_OFFICER'), -- user 1
    ('suresh.kumar@pes.edu',         crypt('Password@123', gen_salt('bf', 10)), 'PLACEMENT_OFFICER'), -- user 2
    ('priya.menon@nimbuscloud.in',   crypt('Password@123', gen_salt('bf', 10)), 'RECRUITER'),         -- user 3
    ('rahul.verma@datavista.in',     crypt('Password@123', gen_salt('bf', 10)), 'RECRUITER'),         -- user 4
    ('kavya.iyer@infracore.in',      crypt('Password@123', gen_salt('bf', 10)), 'RECRUITER'),         -- user 5
    ('arjun.shah@finedge.in',        crypt('Password@123', gen_salt('bf', 10)), 'RECRUITER'),         -- user 6
    ('aarav.nair@pesu.pes.edu',      crypt('Password@123', gen_salt('bf', 10)), 'STUDENT'),           -- user 7
    ('diya.kulkarni@pesu.pes.edu',   crypt('Password@123', gen_salt('bf', 10)), 'STUDENT'),           -- user 8
    ('rohan.gupta@pesu.pes.edu',     crypt('Password@123', gen_salt('bf', 10)), 'STUDENT'),           -- user 9
    ('sneha.reddy@pesu.pes.edu',     crypt('Password@123', gen_salt('bf', 10)), 'STUDENT'),           -- user 10
    ('karthik.iyer@pesu.pes.edu',    crypt('Password@123', gen_salt('bf', 10)), 'STUDENT'),           -- user 11
    ('meera.joshi@pesu.pes.edu',     crypt('Password@123', gen_salt('bf', 10)), 'STUDENT'),           -- user 12
    ('aditya.singh@pesu.pes.edu',    crypt('Password@123', gen_salt('bf', 10)), 'STUDENT'),           -- user 13
    ('nisha.patil@pesu.pes.edu',     crypt('Password@123', gen_salt('bf', 10)), 'STUDENT'),           -- user 14
    ('vikram.rao@pesu.pes.edu',      crypt('Password@123', gen_salt('bf', 10)), 'STUDENT'),           -- user 15
    ('ananya.bhat@pesu.pes.edu',     crypt('Password@123', gen_salt('bf', 10)), 'STUDENT');           -- user 16


-- ---------------------------------------------------------------------
-- COMPANIES (6). Companies 5 and 6 have no recruiter or jobs yet,
-- which the LEFT JOIN queries use.
-- ---------------------------------------------------------------------
INSERT INTO companies (name, industry, website) VALUES
    ('Nimbus Cloud Systems',    'Cloud Computing', 'https://nimbuscloud.in'),  -- company 1
    ('DataVista Analytics',     'Data & AI',       'https://datavista.in'),    -- company 2
    ('InfraCore Technologies',  'IT Services',     'https://infracore.in'),    -- company 3
    ('FinEdge Payments',        'FinTech',         'https://finedge.in'),      -- company 4
    ('MediSense AI',            'HealthTech',      'https://medisense.ai'),    -- company 5
    ('Voltaic Motors',          'Automotive / EV', 'https://voltaic.in');      -- company 6


-- ---------------------------------------------------------------------
-- ROLE PROFILES: each links back to its users row (one-to-one)
-- ---------------------------------------------------------------------
INSERT INTO placement_officers (user_id, employee_id, full_name, department) VALUES
    (1, 'PES-PO-101', 'Dr. Anita Rao',  'Training & Placement Cell'),  -- officer 1
    (2, 'PES-PO-102', 'Suresh Kumar',   'Training & Placement Cell');  -- officer 2

INSERT INTO recruiters (user_id, company_id, full_name, designation) VALUES
    (3, 1, 'Priya Menon', 'Senior Talent Partner'),   -- recruiter 1 -> Nimbus
    (4, 2, 'Rahul Verma', 'Engineering Manager'),     -- recruiter 2 -> DataVista
    (5, 3, 'Kavya Iyer',  'HR Lead'),                 -- recruiter 3 -> InfraCore
    (6, 4, 'Arjun Shah',  'Campus Recruiter');        -- recruiter 4 -> FinEdge

INSERT INTO students (user_id, usn, full_name, branch, cgpa, grad_year, resume_url) VALUES
    ( 7, 'PES2UG23CS001', 'Aarav Nair',    'CSE',  9.12, 2027, 'https://resumes.pes.edu/PES2UG23CS001.pdf'), -- student 1
    ( 8, 'PES2UG23CS045', 'Diya Kulkarni', 'CSE',  8.45, 2027, 'https://resumes.pes.edu/PES2UG23CS045.pdf'), -- student 2
    ( 9, 'PES2UG23AM012', 'Rohan Gupta',   'AIML', 8.90, 2027, 'https://resumes.pes.edu/PES2UG23AM012.pdf'), -- student 3
    (10, 'PES2UG23CS102', 'Sneha Reddy',   'CSE',  7.35, 2027, 'https://resumes.pes.edu/PES2UG23CS102.pdf'), -- student 4
    (11, 'PES2UG23EC020', 'Karthik Iyer',  'ECE',  7.80, 2027, 'https://resumes.pes.edu/PES2UG23EC020.pdf'), -- student 5
    (12, 'PES2UG23IS033', 'Meera Joshi',   'ISE',  8.10, 2027, 'https://resumes.pes.edu/PES2UG23IS033.pdf'), -- student 6
    (13, 'PES2UG23CS150', 'Aditya Singh',  'CSE',  6.40, 2027, 'https://resumes.pes.edu/PES2UG23CS150.pdf'), -- student 7
    (14, 'PES2UG23EE007', 'Nisha Patil',   'EEE',  7.95, 2027, 'https://resumes.pes.edu/PES2UG23EE007.pdf'), -- student 8
    (15, 'PES2UG23ME015', 'Vikram Rao',    'ME',   7.20, 2027, 'https://resumes.pes.edu/PES2UG23ME015.pdf'), -- student 9
    (16, 'PES2UG23AM040', 'Ananya Bhat',   'AIML', 9.40, 2027, 'https://resumes.pes.edu/PES2UG23AM040.pdf'); -- student 10


-- ---------------------------------------------------------------------
-- SKILLS (16)
-- ---------------------------------------------------------------------
INSERT INTO skills (name, category) VALUES
    ('Python',                       'Programming Language'),  -- 1
    ('Java',                         'Programming Language'),  -- 2
    ('JavaScript',                   'Programming Language'),  -- 3
    ('TypeScript',                   'Programming Language'),  -- 4
    ('C++',                          'Programming Language'),  -- 5
    ('SQL',                          'Database'),              -- 6
    ('PostgreSQL',                   'Database'),              -- 7
    ('React',                        'Frontend'),              -- 8
    ('Node.js',                      'Backend'),               -- 9
    ('Machine Learning',             'AI / ML'),               -- 10
    ('Deep Learning',                'AI / ML'),               -- 11
    ('Data Structures & Algorithms', 'Core CS'),               -- 12
    ('Docker',                       'DevOps'),                -- 13
    ('AWS',                          'Cloud'),                 -- 14
    ('Embedded C',                   'Embedded Systems'),      -- 15
    ('Communication',                'Soft Skill');            -- 16

INSERT INTO student_skills (student_id, skill_id, proficiency) VALUES
    -- 1 Aarav: backend
    (1, 3, 'ADVANCED'), (1, 9, 'EXPERT'), (1, 7, 'ADVANCED'), (1, 13, 'INTERMEDIATE'), (1, 12, 'ADVANCED'),
    -- 2 Diya: ML
    (2, 1, 'EXPERT'), (2, 10, 'ADVANCED'), (2, 6, 'INTERMEDIATE'), (2, 11, 'INTERMEDIATE'),
    -- 3 Rohan: deep learning
    (3, 1, 'ADVANCED'), (3, 10, 'ADVANCED'), (3, 11, 'EXPERT'), (3, 14, 'BEGINNER'),
    -- 4 Sneha: frontend
    (4, 3, 'ADVANCED'), (4, 8, 'EXPERT'), (4, 4, 'INTERMEDIATE'), (4, 16, 'ADVANCED'),
    -- 5 Karthik: embedded
    (5, 5, 'ADVANCED'), (5, 15, 'EXPERT'), (5, 1, 'BEGINNER'),
    -- 6 Meera: Java + SQL
    (6, 2, 'ADVANCED'), (6, 6, 'ADVANCED'), (6, 12, 'INTERMEDIATE'), (6, 16, 'INTERMEDIATE'),
    -- 7 Aditya: beginner web
    (7, 3, 'INTERMEDIATE'), (7, 8, 'BEGINNER'), (7, 6, 'BEGINNER'),
    -- 8 Nisha: data
    (8, 1, 'ADVANCED'), (8, 6, 'ADVANCED'), (8, 16, 'ADVANCED'),
    -- 9 Vikram: basics
    (9, 1, 'BEGINNER'), (9, 16, 'INTERMEDIATE'),
    -- 10 Ananya: ML + cloud
    (10, 1, 'EXPERT'), (10, 10, 'EXPERT'), (10, 11, 'ADVANCED'), (10, 14, 'INTERMEDIATE'), (10, 13, 'INTERMEDIATE');


-- ---------------------------------------------------------------------
-- JOB POSTINGS (8): 6 OPEN, 1 CLOSED, 1 DRAFT
-- Deadlines are relative to today so the data never goes stale.
-- ---------------------------------------------------------------------
INSERT INTO job_postings
    (company_id, posted_by, title, location, ctc, min_cgpa, eligible_branches, deadline, status)
VALUES
    (1, 1, 'Backend Engineer (Node.js)', 'Bengaluru', 1800000, 7.50, 'CSE,ISE,AIML',          CURRENT_DATE + 30, 'OPEN'),   -- job 1
    (1, 1, 'Cloud Support Associate',    'Hyderabad',  900000, 6.50, 'CSE,ISE,ECE,EEE',       CURRENT_DATE + 21, 'OPEN'),   -- job 2
    (2, 2, 'Machine Learning Engineer',  'Bengaluru', 2400000, 8.00, 'CSE,AIML',              CURRENT_DATE + 25, 'OPEN'),   -- job 3
    (2, 2, 'Data Analyst',               'Pune',      1100000, 7.00, 'CSE,ISE,AIML,EEE,ECE',  CURRENT_DATE + 20, 'OPEN'),   -- job 4
    (3, 3, 'Systems Engineer',           'Mysuru',     650000, 6.00, 'CSE,ISE,ECE,EEE,ME,AIML', CURRENT_DATE + 15, 'OPEN'), -- job 5
    (3, 3, 'Embedded Software Engineer', 'Bengaluru', 1000000, 7.00, 'ECE,EEE',               CURRENT_DATE + 18, 'OPEN'),   -- job 6
    (4, 4, 'Frontend Developer (React)', 'Bengaluru', 1500000, 7.00, 'CSE,ISE',               CURRENT_DATE - 10, 'CLOSED'), -- job 7
    (4, 4, 'Full Stack Developer',       'Remote',    1600000, 7.50, 'CSE,ISE,AIML',          CURRENT_DATE + 40, 'DRAFT');  -- job 8

INSERT INTO job_skills (job_id, skill_id, weight) VALUES
    (1, 9, 0.900), (1, 3, 0.800), (1, 7, 0.600), (1, 13, 0.400), (1, 12, 0.500),
    (2, 14, 0.800), (2, 13, 0.500), (2, 16, 0.600), (2, 6, 0.300),
    (3, 1, 0.900), (3, 10, 0.900), (3, 11, 0.700), (3, 6, 0.300),
    (4, 6, 0.900), (4, 1, 0.700), (4, 16, 0.400),
    (5, 2, 0.700), (5, 6, 0.500), (5, 12, 0.600), (5, 16, 0.500),
    (6, 15, 0.900), (6, 5, 0.800),
    (7, 8, 0.900), (7, 3, 0.800), (7, 4, 0.600),
    (8, 8, 0.700), (8, 9, 0.700), (8, 4, 0.600), (8, 7, 0.500);


-- ---------------------------------------------------------------------
-- INTERVIEW ROUNDS: round_id values are noted for application_rounds
-- ---------------------------------------------------------------------
INSERT INTO interview_rounds (job_id, round_no, round_name, round_type) VALUES
    (1, 1, 'Online Coding Test',      'ONLINE_TEST'),          -- round 1
    (1, 2, 'Technical Interview',     'TECHNICAL_INTERVIEW'),  -- round 2
    (1, 3, 'HR Interview',            'HR_INTERVIEW'),         -- round 3
    (3, 1, 'Online Assessment',       'ONLINE_TEST'),          -- round 4
    (3, 2, 'ML Technical Interview',  'TECHNICAL_INTERVIEW'),  -- round 5
    (3, 3, 'System Design Interview', 'TECHNICAL_INTERVIEW'),  -- round 6
    (3, 4, 'HR Interview',            'HR_INTERVIEW'),         -- round 7
    (4, 1, 'Aptitude + SQL Test',     'ONLINE_TEST'),          -- round 8
    (4, 2, 'Group Discussion',        'GD'),                   -- round 9
    (4, 3, 'HR Interview',            'HR_INTERVIEW'),         -- round 10
    (5, 1, 'Online Test',             'ONLINE_TEST'),          -- round 11
    (5, 2, 'HR Interview',            'HR_INTERVIEW'),         -- round 12
    (6, 1, 'Technical Interview',     'TECHNICAL_INTERVIEW'),  -- round 13
    (6, 2, 'HR Interview',            'HR_INTERVIEW');         -- round 14


-- ---------------------------------------------------------------------
-- EMBEDDINGS (placeholder until Stage 3)
--
-- Stage 3 fills these with real 768-dim vectors from all-mpnet-base-v2.
-- For now each vector is a "skill vector": dimension d holds the person's
-- level in skill d (student: proficiency 1-4, job: weight x 4), and 0.001
-- everywhere else so no vector is all zeros. Students and jobs that share
-- skills therefore point in similar directions, so cosine similarity
-- already gives sensible rankings for the Stage 2 queries.
-- ---------------------------------------------------------------------
INSERT INTO resume_embeddings (student_id, embedding, model_name)
SELECT s.student_id,
       ARRAY(
           SELECT COALESCE(sk.level, 0) + 0.001
           FROM generate_series(1, 768) AS d(dim)
           LEFT JOIN (
               SELECT skill_id,
                      CASE proficiency
                          WHEN 'BEGINNER'     THEN 1
                          WHEN 'INTERMEDIATE' THEN 2
                          WHEN 'ADVANCED'     THEN 3
                          WHEN 'EXPERT'       THEN 4
                      END AS level
               FROM student_skills
               WHERE student_id = s.student_id
           ) sk ON sk.skill_id = d.dim
           ORDER BY d.dim
       )::real[]::vector(768),
       'placeholder-skill-vector'
FROM students s;

INSERT INTO job_embeddings (job_id, embedding, model_name)
SELECT j.job_id,
       ARRAY(
           SELECT COALESCE(js.weight * 4, 0) + 0.001
           FROM generate_series(1, 768) AS d(dim)
           LEFT JOIN job_skills js
                  ON js.job_id = j.job_id AND js.skill_id = d.dim
           ORDER BY d.dim
       )::real[]::vector(768),
       'placeholder-skill-vector'
FROM job_postings j;


-- ---------------------------------------------------------------------
-- MATCH RECOMMENDATIONS: every student x every OPEN job
--   <=>  is pgvector's cosine DISTANCE (0 = same direction)
--   similarity  = 1 - distance, clamped at 0
--   match_score = 80% semantic similarity + 20% academic record
-- ---------------------------------------------------------------------
INSERT INTO match_recommendations (student_id, job_id, similarity, match_score)
SELECT r.student_id,
       je.job_id,
       ROUND(GREATEST(0, 1 - (r.embedding <=> je.embedding))::numeric, 4),
       ROUND((0.8 * GREATEST(0, 1 - (r.embedding <=> je.embedding))
            + 0.2 * COALESCE(s.cgpa, 0) / 10)::numeric, 4)
FROM resume_embeddings r
JOIN students       s  ON s.student_id = r.student_id
CROSS JOIN job_embeddings je
JOIN job_postings   jp ON jp.job_id = je.job_id
WHERE r.is_current
  AND je.is_current
  AND jp.status = 'OPEN';


-- ---------------------------------------------------------------------
-- APPLICATIONS (15)
-- Every application is to an OPEN job, before its deadline, by a student
-- who meets min_cgpa and the branch list, so this data also passes the
-- Stage 3 eligibility trigger. match_score is copied from the recs table.
-- Sneha (student 4) deliberately has no applications.
-- ---------------------------------------------------------------------
INSERT INTO applications
    (student_id, job_id, reviewed_by, status, match_score, applied_at, reviewed_at)
SELECT v.student_id,
       v.job_id,
       v.reviewed_by,
       v.status::application_status,
       (SELECT m.match_score
          FROM match_recommendations m
         WHERE m.student_id = v.student_id AND m.job_id = v.job_id),
       CURRENT_TIMESTAMP - make_interval(days => v.applied_days_ago),
       CURRENT_TIMESTAMP - make_interval(days => v.reviewed_days_ago)
FROM (VALUES
    -- student, job, reviewer(user_id), status, applied N days ago, reviewed N days ago
    ( 1, 1,    3, 'SHORTLISTED', 9, 6),     -- app 1
    ( 6, 1, NULL, 'APPLIED',     5, NULL),  -- app 2
    (10, 1, NULL, 'APPLIED',     3, NULL),  -- app 3
    ( 2, 3,    4, 'SHORTLISTED', 8, 5),     -- app 4
    ( 3, 3,    4, 'OFFERED',    12, 2),     -- app 5
    (10, 3,    4, 'SHORTLISTED', 7, 4),     -- app 6
    ( 8, 4,    1, 'SHORTLISTED', 6, 3),     -- app 7
    ( 2, 4, NULL, 'APPLIED',     2, NULL),  -- app 8
    ( 6, 5,    5, 'HIRED',      14, 1),     -- app 9
    ( 9, 5,    2, 'REJECTED',   10, 6),     -- app 10
    ( 7, 5, NULL, 'APPLIED',     4, NULL),  -- app 11
    ( 5, 6,    5, 'SHORTLISTED', 6, 2),     -- app 12
    ( 8, 6, NULL, 'APPLIED',     1, NULL),  -- app 13
    ( 5, 2, NULL, 'APPLIED',     3, NULL),  -- app 14
    ( 1, 2,    1, 'WITHDRAWN',   8, 7)      -- app 15
) AS v(student_id, job_id, reviewed_by, status, applied_days_ago, reviewed_days_ago);


-- ---------------------------------------------------------------------
-- APPLICATION ROUNDS: progress of shortlisted / offered / hired candidates
-- ---------------------------------------------------------------------
INSERT INTO application_rounds (application_id, round_id, result, scheduled_at, feedback) VALUES
    (1,  1,  'PASSED',   CURRENT_TIMESTAMP - INTERVAL '7 days', 'Solved 3/3 problems'),
    (1,  2,  'PENDING',  CURRENT_TIMESTAMP + INTERVAL '2 days', NULL),
    (4,  4,  'PASSED',   CURRENT_TIMESTAMP - INTERVAL '6 days', 'Strong Python fundamentals'),
    (4,  5,  'PENDING',  CURRENT_TIMESTAMP + INTERVAL '3 days', NULL),
    (5,  4,  'PASSED',   CURRENT_TIMESTAMP - INTERVAL '10 days', 'Top scorer'),
    (5,  5,  'PASSED',   CURRENT_TIMESTAMP - INTERVAL '8 days', 'Excellent grasp of CNNs'),
    (5,  6,  'PASSED',   CURRENT_TIMESTAMP - INTERVAL '6 days', 'Clear system design'),
    (5,  7,  'PASSED',   CURRENT_TIMESTAMP - INTERVAL '4 days', 'Good culture fit'),
    (6,  4,  'PASSED',   CURRENT_TIMESTAMP - INTERVAL '5 days', 'Good score'),
    (7,  8,  'PASSED',   CURRENT_TIMESTAMP - INTERVAL '4 days', 'Strong SQL'),
    (7,  9,  'PENDING',  CURRENT_TIMESTAMP + INTERVAL '1 day',  NULL),
    (9,  11, 'PASSED',   CURRENT_TIMESTAMP - INTERVAL '12 days', 'Cleared cutoff'),
    (9,  12, 'PASSED',   CURRENT_TIMESTAMP - INTERVAL '3 days', 'Offer recommended'),
    (10, 11, 'REJECTED', CURRENT_TIMESTAMP - INTERVAL '8 days', 'Below aptitude cutoff'),
    (12, 13, 'PENDING',  CURRENT_TIMESTAMP + INTERVAL '2 days', NULL);


-- ---------------------------------------------------------------------
-- Row counts (screenshot this as evidence that the data loaded)
-- ---------------------------------------------------------------------
SELECT 'users' AS table_name, COUNT(*) AS rows FROM users
UNION ALL SELECT 'companies',             COUNT(*) FROM companies
UNION ALL SELECT 'placement_officers',    COUNT(*) FROM placement_officers
UNION ALL SELECT 'recruiters',            COUNT(*) FROM recruiters
UNION ALL SELECT 'students',              COUNT(*) FROM students
UNION ALL SELECT 'skills',                COUNT(*) FROM skills
UNION ALL SELECT 'student_skills',        COUNT(*) FROM student_skills
UNION ALL SELECT 'job_postings',          COUNT(*) FROM job_postings
UNION ALL SELECT 'job_skills',            COUNT(*) FROM job_skills
UNION ALL SELECT 'interview_rounds',      COUNT(*) FROM interview_rounds
UNION ALL SELECT 'resume_embeddings',     COUNT(*) FROM resume_embeddings
UNION ALL SELECT 'job_embeddings',        COUNT(*) FROM job_embeddings
UNION ALL SELECT 'match_recommendations', COUNT(*) FROM match_recommendations
UNION ALL SELECT 'applications',          COUNT(*) FROM applications
UNION ALL SELECT 'application_rounds',    COUNT(*) FROM application_rounds;
