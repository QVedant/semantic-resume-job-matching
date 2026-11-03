# Project Setup Guide

This guide sets up the **Resume Semantic Job Matching System** on your Windows
laptop, so both teammates have the same setup.

Follow the steps **in order**. Each step ends with a **✅ Check** so you know it
worked before moving on.

**What you'll have at the end:**
- PostgreSQL 18 with the pgvector add-on, running on your laptop
- The project code from GitHub
- A database called `placement_db` with all 15 tables and the sample data loaded

**Time needed:** about 30–60 minutes (most of it is installing software).

---

## How to run the commands in this guide

- Use **PowerShell**: press the Windows key, type `PowerShell`, and open it.
- **Paste one command at a time**, press Enter, and wait for it to finish
  before pasting the next.
- Copy only the command itself. A stray backtick ( ` ) at the end of a line
  makes PowerShell show a `>>` prompt and wait. If that happens, press
  `Ctrl + C` and paste the command again.

---

## Step 1: Install Git

1. Download Git from https://git-scm.com/download/win and install it with the
   default options.
2. Close PowerShell and open it again.
3. Tell Git who you are. **Use the same email as your GitHub account**, because
   the course checks each person's commits:
   ```powershell
   git config --global user.name "Your Name"
   ```
   ```powershell
   git config --global user.email "your-github-email@example.com"
   ```

✅ **Check:** `git --version` prints a version number, for example `git version 2.46.1`.

---

## Step 2: Install PostgreSQL 18

PostgreSQL is the database software. `psql` is the terminal program we use to
talk to it.

1. Download the **PostgreSQL 18 Windows installer** from
   https://www.postgresql.org/download/windows/ (the "EDB installer" link).
2. Run the installer and keep the defaults, except:
   - **Components:** keep *PostgreSQL Server* and *Command Line Tools* ticked.
     pgAdmin is optional. Untick *Stack Builder*.
   - **Password:** choose a password for the `postgres` user and
     **write it down**. You'll need it all the time.
   - **Port:** keep `5432`.
3. Make `psql` usable from any folder by adding it to your PATH:
   1. Press the Windows key, type **"Edit the system environment variables"**, and open it.
   2. Click **Environment Variables…**
   3. Under *System variables*, select **Path** → **Edit** → **New**.
   4. Paste `C:\Program Files\PostgreSQL\18\bin` and click **OK** on every window.
   5. Close PowerShell and open it again.

✅ **Check:** `psql --version` prints `psql (PostgreSQL) 18.x`.

---

## Step 3: Install pgvector (the vector add-on)

pgvector adds the `vector(768)` column type and fast similarity search to
PostgreSQL. Our project can't work without it.

**First, check whether you already have it:**
```powershell
Test-Path "C:\Program Files\PostgreSQL\18\share\extension\vector.control"
```
- If it prints **True**, skip to Step 4.
- If it prints **False**, install it as follows (this is the official method from
  the pgvector GitHub page).

### 3a. Install the C++ build tools (one time only)
1. Download **Build Tools for Visual Studio 2022** from
   https://visualstudio.microsoft.com/downloads/ (scroll down to
   *Tools for Visual Studio*).
2. In the installer, tick **"Desktop development with C++"** and install it.
   It's a large download.

### 3b. Build and install pgvector
1. Press the Windows key, type **"x64 Native Tools Command Prompt for VS 2022"**,
   right-click it, and choose **Run as administrator**.
   This is a black **Command Prompt** window, **not** PowerShell.
2. Run these lines one at a time:
   ```bat
   set "PGROOT=C:\Program Files\PostgreSQL\18"
   cd %TEMP%
   git clone --branch v0.8.7 https://github.com/pgvector/pgvector.git
   cd pgvector
   nmake /F Makefile.win
   nmake /F Makefile.win install
   ```
3. Close that window.

✅ **Check:** back in PowerShell, this prints **True**:
```powershell
Test-Path "C:\Program Files\PostgreSQL\18\share\extension\vector.control"
```

> **Stuck on this step?** See the Docker option in the appendix at the end
> of this guide.

---

## Step 4: Get the project code

Pick a folder for the project. We use `C:\DBMS_MiniProject` (Yash uses this
path too, so commands look the same on both laptops).

**If you don't have the project yet:**
```powershell
mkdir C:\DBMS_MiniProject
```
```powershell
cd C:\DBMS_MiniProject
```
```powershell
git clone https://github.com/QVedant/Semantic-Resume-Job-Matching.git semantic-resume-job-matching
```

**If you already cloned it before**, just fetch the latest changes:
```powershell
cd C:\DBMS_MiniProject\semantic-resume-job-matching
```
```powershell
git pull
```

✅ **Check:** the `sql` folder contains these 8 files:
```powershell
dir C:\DBMS_MiniProject\semantic-resume-job-matching\sql
```

| File | What it does |
| --- | --- |
| `schema.sql` | Creates all tables, rules (constraints) and indexes. Starts by deleting the old ones, so it's safe to re-run. |
| `alter_drop.sql` | Changes some tables after creation (ALTER / DROP demo) |
| `seed.sql` | Fills the tables with sample data |
| `inspect_schema.sql` | Displays the table structure |
| `show_sample_data.sql` | Displays the sample data |
| `queries.sql` | 16 advanced queries (JOIN, GROUP BY, subqueries, vector search…) |
| `dml.sql` | INSERT / UPDATE / DELETE / SELECT demos (this changes data) |
| `tests.sql` | 10 test cases |

If some files are missing, they probably haven't been pushed yet. Ask your
teammate.

---

## Step 5: Create the database and load everything

Open PowerShell and go to the project folder:
```powershell
cd C:\DBMS_MiniProject\semantic-resume-job-matching
```

**Every time you open a new PowerShell window**, run these two lines first:
```powershell
chcp 1252
```
```powershell
$env:PGPASSWORD = "the-postgres-password-from-step-2"
```
- `chcp 1252` stops a "console code page" warning from cluttering the output.
- The second line saves you typing the password for every command. It only
  lasts until you close that window.

### 5a. Create an empty database
```powershell
psql -U postgres -d postgres -c "CREATE DATABASE placement_db;"
```
✅ **Check:** it prints `CREATE DATABASE`.
(If it says `already exists`, that's fine too.)

### 5b. Build the tables
```powershell
psql -U postgres -d placement_db -f sql/schema.sql
```
✅ **Check:** you see `SET`, several `DROP …` lines, `CREATE EXTENSION`,
`CREATE TYPE`, 15× `CREATE TABLE` and 6× `CREATE INDEX`, with **no `ERROR` lines**.

> ⚠️ Always include `-d placement_db`. Without it, the tables go into the
> default `postgres` database by mistake.

### 5c. Apply the ALTER changes
```powershell
psql -U postgres -d placement_db -f sql/alter_drop.sql
```
✅ **Check:** you see `ALTER TABLE`, `DROP INDEX` and `CREATE INDEX`, with no `ERROR` lines.

### 5c-2. Add the trigger, stored function and view
```powershell
psql -U postgres -d placement_db -f sql/triggers.sql
```
✅ **Check:** you see `CREATE FUNCTION`, `CREATE TRIGGER` and `CREATE VIEW`, with no
`ERROR` lines. From now on, the database itself rejects ineligible applications.

### 5c-3. Add the resume-text and job-description columns
```powershell
psql -U postgres -d placement_db -f sql/embeddings_alter.sql
```
✅ **Check:** you see `CREATE FUNCTION` and several `ALTER TABLE` lines, with no `ERROR`
lines. Students now have a `resume_text` column, and jobs have a `description` column,
each limited to 300 words.

### 5d. Load the sample data
```powershell
psql -U postgres -d placement_db -f sql/seed.sql
```
✅ **Check:** it ends with this table:

| table_name | rows |
| --- | --- |
| users | 16 |
| companies | 6 |
| placement_officers | 2 |
| recruiters | 4 |
| students | 10 |
| skills | 16 |
| student_skills | 37 |
| job_postings | 8 |
| job_skills | 29 |
| interview_rounds | 14 |
| resume_embeddings | 10 |
| job_embeddings | 8 |
| match_recommendations | 60 |
| applications | 15 |
| application_rounds | 15 |

**🎉 If you got this table, your setup matches Yash's.**

### 5e. Load the sample resume texts and job descriptions
```powershell
psql -U postgres -d placement_db -f sql/seed_text.sql
```
✅ **Check:** it ends with a small table showing **10 of 10** students and **8 of 8**
jobs have text.

The vectors loaded so far are simple placeholders. Step 9d replaces them with real
AI embeddings.

---

## Step 6: Quick test of the vector search

This asks the database: *"which 3 jobs best fit student Aarav?"*
```powershell
psql -U postgres -d placement_db -P pager=off -f sql/queries.sql
```
✅ **Check:** scroll to **Q14**. The top result is
`Backend Engineer (Node.js)` with cosine_similarity **0.9888** (with the placeholder
vectors). After Step 9d, Backend Engineer is still first, but the number is lower
(about 0.63). Real AI embeddings give smaller similarity values; what matters is the
order.

---

## Step 7 (optional): Run the other demo files

These are the files used for the Stage 2 screenshots. Add `-e` to print each
SQL statement above its result, and `-P pager=off` so long results don't pause:
```powershell
psql -U postgres -d placement_db -P pager=off -f sql/inspect_schema.sql
```
```powershell
psql -U postgres -d placement_db -P pager=off -e -f sql/show_sample_data.sql
```
```powershell
psql -U postgres -d placement_db -P pager=off -e -f sql/dml.sql
```
```powershell
psql -U postgres -d placement_db -P pager=off -e -f sql/tests.sql
```
- `tests.sql` **should** show 7 red `ERROR` lines (TC02, TC04–TC09). Each one is
  the database correctly blocking bad data, so those tests pass.
- `dml.sql` changes the data (closes a job, deletes rows…).

To see the trigger, function and view in action:
```powershell
psql -U postgres -d placement_db -P pager=off -e -f sql/triggers_test.sql
```
This **should** show 6 red `ERROR` lines (T4–T9): the trigger blocking ineligible
applications.

**To reset everything back to fresh sample data at any time**, re-run
5b → 5c → 5c-2 → 5c-3 → 5d → 5e, then `npm run embed:all` (Step 9d).

---

## Step 8: Install Node.js (needed for Stage 3)

Stage 3 builds the website with Next.js, which needs Node.js. Installing it now
saves time later.

1. Download the **LTS** version from https://nodejs.org and install it with the
   defaults.
2. Close PowerShell and open it again.

✅ **Check:** `node --version` prints `v22.x` or newer, and `npm --version`
prints a version number.

---

## Step 9: Run the website

### 9a. Install the project's packages (first time, and after a `git pull` that changes `package.json`)
```powershell
cd C:\DBMS_MiniProject\semantic-resume-job-matching
```
```powershell
npm install
```
This downloads Next.js and the other libraries into a `node_modules` folder
(git-ignored). On a slow connection it can take 10+ minutes; let it finish.

### 9b. Create your `.env` file (one time only)
The website needs your database password. It reads it from a file called `.env`,
which Git ignores, so the password never reaches GitHub.
```powershell
Copy-Item .env.example .env
```
Then open `.env` in the editor and fill in two values:

1. **`DATABASE_URL`**: replace `YOUR_PASSWORD` with your PostgreSQL password from
   Step 2. If the password contains special characters, replace them as the comments
   in the file explain (for example `@` becomes `%40`).
2. **`JWT_SECRET`**: the secret key that signs logins. Generate a random one:
   ```powershell
   node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
   ```
   Copy the output and paste it after `JWT_SECRET=` in place of
   `replace-with-a-long-random-string`. The website refuses to log anyone in while
   the example value is still there.

Save the file (`Ctrl + S`).

### 9c. Start the website
```powershell
npm run dev
```
Wait for `✓ Ready`, then open **http://localhost:3000** in your browser.
Press `Ctrl + C` in PowerShell to stop the website.

✅ **Check:**
- The home page shows the student, company, job and application counts under
  **"Live from the database"**.
- http://localhost:3000/api/health shows `"status":"ok"` and `"pgvector_version":"0.8.7"`.
- **Log in** works with any sample account. Every sample account's password is
  `Password@123`:

  | Role | Email |
  | --- | --- |
  | Student | `aarav.nair@pesu.pes.edu` |
  | Recruiter | `priya.menon@nimbuscloud.in` |
  | Placement officer | `anita.rao@pes.edu` |

If the home page says **"✗ Cannot reach the database"**, the message under it tells
you why. Usually the password in `.env` is wrong, or PostgreSQL isn't running.

### 9d. Download the AI model and create the real embeddings
The matching uses the `all-mpnet-base-v2` model, which runs on your laptop.
**Download it once (about 420 MB):**
```powershell
npm run model:download
```
✅ **Check:** it ends with `Test embedding: 768 numbers, ...`. The model is saved in
the `.model-cache` folder (git-ignored), and everything works offline after this.

**Then turn every sample resume and job into a real embedding:**
```powershell
npm run embed:all
```
✅ **Check:** it lists the 10 students and 8 jobs it embedded, then a table of each
student's best open job, for example Aarav Nair → Backend Engineer (Node.js) and
Karthik Iyer → Embedded Software Engineer.

**To see the matching in the website:** log in as `aarav.nair@pesu.pes.edu`, then open
http://localhost:3000/api/match. It shows his jobs ranked by meaning, each marked
eligible or not.

---

## How we use Git (both of us)

**Before you start working:**
```powershell
git pull
```

**After you finish a piece of work:**
```powershell
git add path/to/the/files/you/changed
```
```powershell
git commit -m "Short description of what you did"
```
```powershell
git push origin main
```

**Rules:**
1. **Always `git pull` before you start.** It's the easiest way to avoid merge conflicts.
2. **Name the files in `git add`.** Avoid `git add .`, so nothing private gets uploaded by accident.
3. **Never commit `.env` or any file containing a password.**
4. **Commit from your own laptop and account.** The course checks individual
   contributions, so each of us should commit the parts we worked on and can explain.

---

## Troubleshooting

| Problem | Cause | Fix |
| --- | --- | --- |
| `psql : The term 'psql' is not recognized` | PostgreSQL's `bin` folder isn't in PATH | Redo Step 2.3, then **reopen** PowerShell |
| `password authentication failed for user "postgres"` | Wrong password in `$env:PGPASSWORD` (psql) or in `.env` (website) | Fix the password and try again. In `.env`, URL-encode special characters. |
| Website says `DATABASE_URL is not set` | No `.env` file | Do Step 9b, then restart `npm run dev` |
| `npm run model:download` fails or stops | Internet dropped during the 420 MB download | Run it again: it resumes from what's already saved |
| `/api/match` says "Add your resume text first" | No real embeddings yet | Run Step 5e and then `npm run embed:all` (Step 9d) |
| Login fails with an error mentioning `JWT_SECRET` | `.env` still has the example secret, or it's too short | Generate one as shown in Step 9b, then restart `npm run dev` |
| `npm run dev` says port 3000 is in use | Another copy of the website is already running | Close the other PowerShell window running it, or use `npm run dev -- -p 3001` |
| `extension "vector" is not available` | pgvector isn't installed | Do Step 3 |
| `relation "students" does not exist` | `schema.sql` wasn't run on `placement_db` | Run 5b, and check that `-d placement_db` is in the command |
| `database "placement_db" does not exist` | You skipped 5a | Run 5a |
| `database "placement_db" is being accessed by other users` | Another psql window (or pgAdmin) is connected | Close it and try again |
| PowerShell shows `>>` and waits | A stray backtick ( ` ) at the end of the command | Press `Ctrl + C` and paste the command again without it |
| Output pauses at `-- More --` | psql's pager | Press `q`, and add `-P pager=off` to the command |
| `git push` says `403` / permission denied | You aren't a collaborator on the GitHub repo | The repo owner adds you under **Settings → Collaborators** |

---

## Appendix: Docker option (only if Step 3 fails)

If you can't build pgvector, you can run a ready-made PostgreSQL + pgvector in
Docker instead. You still need Step 2 for the `psql` command.

1. Install **Docker Desktop** from https://www.docker.com/products/docker-desktop/
   and start it.
2. Start the database container. It uses port **5433**, so it doesn't clash with
   the PostgreSQL from Step 2:
   ```powershell
   docker run -d --name placement-pg -e POSTGRES_PASSWORD=postgres -p 5433:5432 pgvector/pgvector:pg18
   ```
3. Use the password `postgres`:
   ```powershell
   $env:PGPASSWORD = "postgres"
   ```
4. In **every** `psql` command in this guide, add `-h localhost -p 5433` right
   after `psql`. For example:
   ```powershell
   psql -h localhost -p 5433 -U postgres -d placement_db -f sql/schema.sql
   ```
5. After restarting your laptop, start the container again with
   `docker start placement-pg`.
