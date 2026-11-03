import { requireRole } from "@/lib/auth";
import { query } from "@/lib/db";

type RecruiterProfile = {
  full_name: string;
  designation: string | null;
  company_name: string;
  jobs_posted: number;
  applications_received: number;
};

// Recruiter dashboard. Placeholder for now: shows the profile read from the
// database. Posting jobs and reviewing applicants come in step 6.
export default async function RecruiterDashboard() {
  const session = await requireRole("RECRUITER");
  const [profile] = await query<RecruiterProfile>(
    `SELECT r.full_name, r.designation, c.name AS company_name,
            (SELECT COUNT(*)::int FROM job_postings j WHERE j.posted_by = r.recruiter_id) AS jobs_posted,
            (SELECT COUNT(*)::int FROM applications a
               JOIN job_postings j ON j.job_id = a.job_id
              WHERE j.posted_by = r.recruiter_id)                                     AS applications_received
     FROM recruiters r
     JOIN companies c ON c.company_id = r.company_id
     WHERE r.user_id = $1`,
    [session.userId],
  );

  return (
    <main className="mx-auto max-w-5xl space-y-6 px-6 py-10">
      <h1 className="text-3xl font-bold tracking-tight">Welcome, {profile?.full_name}</h1>
      <section className="card grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Info label="Company" value={profile?.company_name} />
        <Info label="Designation" value={profile?.designation || "—"} />
        <Info label="Jobs posted" value={profile?.jobs_posted} />
        <Info label="Applications received" value={profile?.applications_received} />
      </section>
      <p className="opacity-70">Posting jobs and reviewing applicants are coming in step 6.</p>
    </main>
  );
}

function Info({ label, value }: { label: string; value: string | number | undefined }) {
  return (
    <div>
      <p className="text-sm opacity-70">{label}</p>
      <p className="text-lg font-semibold">{value}</p>
    </div>
  );
}
