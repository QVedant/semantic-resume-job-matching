import { requireRole } from "@/lib/auth";
import { query } from "@/lib/db";

type OfficerProfile = {
  full_name: string;
  employee_id: string;
  department: string | null;
};

type Overview = {
  students: number;
  open_jobs: number;
  applications: number;
  placed: number;
};

// Placement officer dashboard. Placeholder for now: profile plus a few
// headline numbers. The full dashboard (using vw_application_overview)
// comes in step 7.
export default async function OfficerDashboard() {
  const session = await requireRole("PLACEMENT_OFFICER");
  const [profile] = await query<OfficerProfile>(
    `SELECT full_name, employee_id, department FROM placement_officers WHERE user_id = $1`,
    [session.userId],
  );
  const [overview] = await query<Overview>(
    `SELECT (SELECT COUNT(*)::int FROM students)                                        AS students,
            (SELECT COUNT(*)::int FROM job_postings WHERE status = 'OPEN')               AS open_jobs,
            (SELECT COUNT(*)::int FROM applications)                                     AS applications,
            (SELECT COUNT(DISTINCT student_id)::int FROM applications
              WHERE status IN ('OFFERED', 'HIRED'))                                     AS placed`,
  );

  return (
    <main className="mx-auto max-w-5xl space-y-6 px-6 py-10">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Welcome, {profile?.full_name}</h1>
        <p className="opacity-70">
          {profile?.department} · Employee ID {profile?.employee_id}
        </p>
      </div>
      <section className="card grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Info label="Students" value={overview.students} />
        <Info label="Open jobs" value={overview.open_jobs} />
        <Info label="Applications" value={overview.applications} />
        <Info label="Students placed" value={overview.placed} />
      </section>
      <p className="opacity-70">The full placement dashboard is coming in step 7.</p>
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
