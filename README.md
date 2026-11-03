# Semantic-Resume-Job-Matching

Mini Project for DBMS Course CS351A. DBMS Level 3 Project, PES University (EC Campus).

A campus placement platform that matches students to jobs by **meaning**, not just
keywords. Resumes and job descriptions are converted into 768-dimensional vector
embeddings and compared with cosine similarity, while structured facts (users,
eligibility, applications, interview rounds) live in relational tables. Both run
inside **one PostgreSQL database** using the pgvector extension.

## Team

| Name | USN |
| --- | --- |
| Yash Tadi | PES2UG24CS608 |
| Vedant Sharma | PES2UG24CS577 |

## Tech stack

| Layer | Choice |
| --- | --- |
| Database | PostgreSQL 18 + pgvector (SQL + Vector Database) |
| Frontend / API | Next.js (App Router), React, TypeScript, Tailwind |
| Database access | `pg` with raw parameterized SQL |
| Auth | bcrypt password hashing + JWT session cookie |
| Embeddings | `all-mpnet-base-v2` (768-dim), run locally |

## Project status

| Stage | Scope | Status |
| --- | --- | --- |
| Stage 1 | Problem definition, ER diagram, relational schema | Done |
| Stage 2 | DDL, ALTER/DROP, sample data, DML, advanced queries, tests | Done |
| Stage 3 | Trigger, stored function, view, Next.js app, auth, semantic search | In progress |

## Getting started

See **[SETUP.md](SETUP.md)** for step-by-step setup on Windows (PostgreSQL,
pgvector, loading the database).

## Repository structure

```
sql/
  schema.sql            tables, ENUM types, constraints, indexes (DDL)
  alter_drop.sql        ALTER / DROP demonstrations
  seed.sql              sample data
  inspect_schema.sql    displays the created structure
  show_sample_data.sql  displays the sample data
  dml.sql               INSERT / UPDATE / DELETE / SELECT demonstrations
  queries.sql           JOIN, GROUP BY, HAVING, subqueries, vector similarity search
  tests.sql             constraint and integrity test cases (TC01-TC10)
  triggers.sql          stored function, eligibility trigger, overview view (Stage 3)
  triggers_test.sql     demonstrations of the function, trigger and view
  embeddings_alter.sql  resume_text / description columns, word_count() + 300-word CHECKs
  seed_text.sql         sample resume texts and job descriptions
scripts/
  download-model.ts     one-time download of the embedding model (npm run model:download)
  embed-all.ts          embed every resume and job, recompute matches (npm run embed:all)
src/
  app/                  Next.js pages and API routes (app/api/**/route.ts)
    api/auth/           register / login / logout
    api/match/          vector similarity search: jobs ranked for the logged-in student
    api/student/resume/ save resume text -> embed -> refresh matches (one transaction)
    student/ recruiter/ officer/   role dashboards
  components/           Navbar, login and register forms
  lib/db.ts             PostgreSQL connection pool, query(), withTransaction()
  lib/auth.ts           bcrypt password hashing, session cookie, role checks
  lib/session.ts        signed JWT session tokens (jose)
  lib/validation.ts     zod input validation schemas
  lib/embeddings.ts     local AI model: text -> 768-number vector
  lib/matching.ts       saves vectors (versioned), refreshes match scores
  middleware.ts         role-based route guard
.env.example            template for the git-ignored .env (database URL, JWT secret)
SETUP.md                local setup guide
```

## Running the web app

```powershell
npm install
Copy-Item .env.example .env   # then put your PostgreSQL password in .env
npm run model:download       # one time: the AI model (~420 MB)
npm run embed:all            # embed all sample resumes and jobs
npm run dev                  # http://localhost:3000
```
