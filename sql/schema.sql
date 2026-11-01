-- =====================================================================
-- schema.sql : Resume Semantic Job Matching System
-- PostgreSQL 18 + pgvector
--
-- Creates every ENUM type, table, constraint and index.
-- Safe to re-run: it drops everything first, then recreates it.
--
-- Run:  psql -U postgres -d placement_db -f sql/schema.sql
-- =====================================================================


-- Hide "does not exist, skipping" notices so the output stays readable.
SET client_min_messages TO WARNING;

-- ---------------------------------------------------------------------
-- 0. Clean slate (appropriate use of DROP)
--    Children are dropped before parents. CASCADE also removes any
--    indexes / constraints that depend on the dropped object.
-- ---------------------------------------------------------------------
DROP TABLE IF EXISTS application_rounds    CASCADE;
DROP TABLE IF EXISTS interview_rounds      CASCADE;
DROP TABLE IF EXISTS applications          CASCADE;
DROP TABLE IF EXISTS match_recommendations CASCADE;
DROP TABLE IF EXISTS job_embeddings        CASCADE;
DROP TABLE IF EXISTS resume_embeddings     CASCADE;
DROP TABLE IF EXISTS job_skills            CASCADE;
DROP TABLE IF EXISTS job_postings          CASCADE;
DROP TABLE IF EXISTS student_skills        CASCADE;
DROP TABLE IF EXISTS skills                CASCADE;
DROP TABLE IF EXISTS recruiters            CASCADE;
DROP TABLE IF EXISTS placement_officers    CASCADE;
DROP TABLE IF EXISTS students              CASCADE;
DROP TABLE IF EXISTS companies             CASCADE;
DROP TABLE IF EXISTS users                 CASCADE;

DROP TYPE IF EXISTS round_result         CASCADE;
DROP TYPE IF EXISTS interview_round_type CASCADE;
DROP TYPE IF EXISTS proficiency_level    CASCADE;
DROP TYPE IF EXISTS job_status           CASCADE;
DROP TYPE IF EXISTS application_status   CASCADE;
DROP TYPE IF EXISTS user_role            CASCADE;


-- ---------------------------------------------------------------------
-- 1. Extensions
--    vector   : the vector(768) data type, <=> cosine operator, HNSW index
--    pgcrypto : crypt() / gen_salt('bf') to bcrypt-hash seed passwords
-- ---------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS pgcrypto;


-- ---------------------------------------------------------------------
-- 2. ENUM types (a column of this type can only hold these values)
-- ---------------------------------------------------------------------
CREATE TYPE user_role AS ENUM (
    'STUDENT',
    'RECRUITER',
    'PLACEMENT_OFFICER'
);

CREATE TYPE application_status AS ENUM (
    'APPLIED',
    'SHORTLISTED',
    'REJECTED',
    'WITHDRAWN',
    'OFFERED',
    'HIRED'
);

CREATE TYPE job_status AS ENUM (
    'OPEN',
    'CLOSED',
    'DRAFT'
);

CREATE TYPE proficiency_level AS ENUM (
    'BEGINNER',
    'INTERMEDIATE',
    'ADVANCED',
    'EXPERT'
);

CREATE TYPE interview_round_type AS ENUM (
    'ONLINE_TEST',
    'HR_INTERVIEW',
    'TECHNICAL_INTERVIEW',
    'GD',
    'OFFER'
);

CREATE TYPE round_result AS ENUM (
    'PENDING',
    'PASSED',
    'REJECTED'
);


-- ---------------------------------------------------------------------
-- 3. Tables (created parent-first so every FK target already exists)
-- ---------------------------------------------------------------------

-- Every login account. The role decides which profile table it links to.
CREATE TABLE users (
    user_id       SERIAL PRIMARY KEY,
    email         VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role          user_role    NOT NULL,
    created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE companies (
    company_id SERIAL PRIMARY KEY,
    name       VARCHAR(255) NOT NULL UNIQUE,
    industry   VARCHAR(100),
    website    VARCHAR(255)
);

-- user_id UNIQUE makes users -> students a one-to-one relationship.
CREATE TABLE students (
    student_id SERIAL PRIMARY KEY,
    user_id    INT          NOT NULL UNIQUE,
    usn        VARCHAR(50)  NOT NULL UNIQUE,
    full_name  VARCHAR(150) NOT NULL,
    branch     VARCHAR(100),
    cgpa       DECIMAL(4,2),
    grad_year  INT,
    resume_url VARCHAR(500),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_student_user
        FOREIGN KEY (user_id)
        REFERENCES users(user_id)
        ON DELETE CASCADE,
    CONSTRAINT chk_student_cgpa
        CHECK (cgpa >= 0 AND cgpa <= 10)
);

CREATE TABLE placement_officers (
    officer_id  SERIAL PRIMARY KEY,
    user_id     INT          NOT NULL UNIQUE,
    employee_id VARCHAR(50)  NOT NULL UNIQUE,
    full_name   VARCHAR(150) NOT NULL,
    department  VARCHAR(100),
    CONSTRAINT fk_officer_user
        FOREIGN KEY (user_id)
        REFERENCES users(user_id)
        ON DELETE CASCADE
);

CREATE TABLE recruiters (
    recruiter_id SERIAL PRIMARY KEY,
    user_id      INT          NOT NULL UNIQUE,
    company_id   INT          NOT NULL,
    full_name    VARCHAR(150) NOT NULL,
    designation  VARCHAR(100),
    CONSTRAINT fk_recruiter_user
        FOREIGN KEY (user_id)
        REFERENCES users(user_id)
        ON DELETE CASCADE,
    CONSTRAINT fk_recruiter_company
        FOREIGN KEY (company_id)
        REFERENCES companies(company_id)
        ON DELETE CASCADE
);

CREATE TABLE skills (
    skill_id SERIAL PRIMARY KEY,
    name     VARCHAR(100) NOT NULL UNIQUE,
    category VARCHAR(100)
);

-- Junction table: many students <-> many skills.
-- The composite primary key stops the same skill being added twice.
CREATE TABLE student_skills (
    student_id  INT               NOT NULL,
    skill_id    INT               NOT NULL,
    proficiency proficiency_level NOT NULL,
    PRIMARY KEY (student_id, skill_id),
    CONSTRAINT fk_student_skill_student
        FOREIGN KEY (student_id)
        REFERENCES students(student_id)
        ON DELETE CASCADE,
    CONSTRAINT fk_student_skill_skill
        FOREIGN KEY (skill_id)
        REFERENCES skills(skill_id)
        ON DELETE CASCADE
);

-- eligible_branches is a comma-separated list, e.g. 'CSE,ISE,AIML'.
CREATE TABLE job_postings (
    job_id            SERIAL PRIMARY KEY,
    company_id        INT          NOT NULL,
    posted_by         INT          NOT NULL,
    title             VARCHAR(200) NOT NULL,
    location          VARCHAR(150),
    ctc               DECIMAL(10,2),
    min_cgpa          DECIMAL(4,2),
    eligible_branches VARCHAR(500),
    deadline          DATE,
    status            job_status NOT NULL DEFAULT 'DRAFT',
    created_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_job_company
        FOREIGN KEY (company_id)
        REFERENCES companies(company_id)
        ON DELETE CASCADE,
    CONSTRAINT fk_job_recruiter
        FOREIGN KEY (posted_by)
        REFERENCES recruiters(recruiter_id)
        ON DELETE CASCADE,
    CONSTRAINT chk_job_ctc
        CHECK (ctc IS NULL OR ctc > 0),
    CONSTRAINT chk_job_min_cgpa
        CHECK (min_cgpa IS NULL OR (min_cgpa >= 0 AND min_cgpa <= 10))
);

-- Junction table: many jobs <-> many skills, with an importance weight 0..1.
CREATE TABLE job_skills (
    job_id   INT          NOT NULL,
    skill_id INT          NOT NULL,
    weight   DECIMAL(4,3) NOT NULL,
    PRIMARY KEY (job_id, skill_id),
    CONSTRAINT fk_job_skill_job
        FOREIGN KEY (job_id)
        REFERENCES job_postings(job_id)
        ON DELETE CASCADE,
    CONSTRAINT fk_job_skill_skill
        FOREIGN KEY (skill_id)
        REFERENCES skills(skill_id)
        ON DELETE CASCADE,
    CONSTRAINT chk_skill_weight
        CHECK (weight >= 0 AND weight <= 1)
);

-- One row per embedding version. Re-embedding a resume inserts a new row
-- and flips the old one's is_current to FALSE, so history is kept.
CREATE TABLE resume_embeddings (
    embedding_id SERIAL PRIMARY KEY,
    student_id   INT          NOT NULL,
    embedding    vector(768)  NOT NULL,
    model_name   VARCHAR(100) NOT NULL DEFAULT 'all-mpnet-base-v2',
    created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_current   BOOLEAN      NOT NULL DEFAULT TRUE,
    CONSTRAINT fk_resume_emb_student
        FOREIGN KEY (student_id)
        REFERENCES students(student_id)
        ON DELETE CASCADE
);

CREATE TABLE job_embeddings (
    embedding_id SERIAL PRIMARY KEY,
    job_id       INT          NOT NULL,
    embedding    vector(768)  NOT NULL,
    model_name   VARCHAR(100) NOT NULL DEFAULT 'all-mpnet-base-v2',
    created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_current   BOOLEAN      NOT NULL DEFAULT TRUE,
    CONSTRAINT fk_job_emb_job
        FOREIGN KEY (job_id)
        REFERENCES job_postings(job_id)
        ON DELETE CASCADE
);

-- Cached result of comparing a resume vector with a job vector.
-- similarity  = 1 - cosine distance, clamped at 0  -> range 0..1
-- match_score = 0.8 * similarity + 0.2 * (cgpa / 10) -> range 0..1
CREATE TABLE match_recommendations (
    rec_id       SERIAL PRIMARY KEY,
    student_id   INT          NOT NULL,
    job_id       INT          NOT NULL,
    similarity   DECIMAL(5,4) NOT NULL,
    match_score  DECIMAL(5,4) NOT NULL,
    generated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_rec_student
        FOREIGN KEY (student_id)
        REFERENCES students(student_id)
        ON DELETE CASCADE,
    CONSTRAINT fk_rec_job
        FOREIGN KEY (job_id)
        REFERENCES job_postings(job_id)
        ON DELETE CASCADE,
    CONSTRAINT uq_rec_student_job
        UNIQUE (student_id, job_id),
    CONSTRAINT chk_rec_similarity
        CHECK (similarity >= 0 AND similarity <= 1),
    CONSTRAINT chk_rec_match_score
        CHECK (match_score >= 0 AND match_score <= 1)
);

-- reviewed_by uses ON DELETE SET NULL: if the reviewer's account is
-- deleted, the application is kept and simply loses its reviewer.
CREATE TABLE applications (
    application_id SERIAL PRIMARY KEY,
    student_id     INT NOT NULL,
    job_id         INT NOT NULL,
    reviewed_by    INT,
    status         application_status NOT NULL DEFAULT 'APPLIED',
    match_score    DECIMAL(5,4),
    applied_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    reviewed_at    TIMESTAMP,
    CONSTRAINT fk_app_student
        FOREIGN KEY (student_id)
        REFERENCES students(student_id)
        ON DELETE CASCADE,
    CONSTRAINT fk_app_job
        FOREIGN KEY (job_id)
        REFERENCES job_postings(job_id)
        ON DELETE CASCADE,
    CONSTRAINT fk_app_reviewer
        FOREIGN KEY (reviewed_by)
        REFERENCES users(user_id)
        ON DELETE SET NULL,
    CONSTRAINT uq_app_student_job
        UNIQUE (student_id, job_id),
    CONSTRAINT chk_app_match_score
        CHECK (match_score IS NULL OR (match_score >= 0 AND match_score <= 1))
);

-- The selection process for a job: round 1, round 2, ...
CREATE TABLE interview_rounds (
    round_id   SERIAL PRIMARY KEY,
    job_id     INT                  NOT NULL,
    round_no   INT                  NOT NULL,
    round_name VARCHAR(100)         NOT NULL,
    round_type interview_round_type NOT NULL,
    CONSTRAINT fk_round_job
        FOREIGN KEY (job_id)
        REFERENCES job_postings(job_id)
        ON DELETE CASCADE,
    CONSTRAINT uq_round_job_no
        UNIQUE (job_id, round_no),
    CONSTRAINT chk_round_no
        CHECK (round_no > 0)
);

-- How one application did in one round.
CREATE TABLE application_rounds (
    ar_id          SERIAL PRIMARY KEY,
    application_id INT          NOT NULL,
    round_id       INT          NOT NULL,
    result         round_result NOT NULL DEFAULT 'PENDING',
    scheduled_at   TIMESTAMP,
    feedback       TEXT,
    CONSTRAINT fk_ar_application
        FOREIGN KEY (application_id)
        REFERENCES applications(application_id)
        ON DELETE CASCADE,
    CONSTRAINT fk_ar_round
        FOREIGN KEY (round_id)
        REFERENCES interview_rounds(round_id)
        ON DELETE CASCADE,
    CONSTRAINT uq_ar_application_round
        UNIQUE (application_id, round_id)
);


-- ---------------------------------------------------------------------
-- 4. Indexes
-- ---------------------------------------------------------------------

-- HNSW = approximate nearest-neighbour graph index from pgvector.
-- vector_cosine_ops makes it serve ORDER BY embedding <=> query_vector.
CREATE INDEX idx_resume_emb_hnsw
    ON resume_embeddings USING hnsw (embedding vector_cosine_ops);

CREATE INDEX idx_job_emb_hnsw
    ON job_embeddings USING hnsw (embedding vector_cosine_ops);

-- B-tree indexes on columns used in frequent WHERE / JOIN conditions.
CREATE INDEX idx_applications_student ON applications(student_id);
CREATE INDEX idx_applications_job     ON applications(job_id);
CREATE INDEX idx_job_postings_company ON job_postings(company_id);
CREATE INDEX idx_job_postings_status  ON job_postings(status);
