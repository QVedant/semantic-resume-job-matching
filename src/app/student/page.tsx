import { requireRole } from "@/lib/auth";
import { query } from "@/lib/db";

type StudentProfile = {
  full_name: string;
  usn: string;
  branch: string;
  cgpa: string; // DECIMAL arrives from pg as a string
  grad_year: number | null;
  applications: number;
};

// Student dashboard. Placeholder for now: shows the profile read from the
// database. Recommended jobs, browsing and applying come in step 5.
export default async function StudentDashboard() {
  const session = await requireRole("STUDENT");
  const [profile] = await query<StudentProfile>(
    `SELECT s.full_name, s.usn, s.branch, s.cgpa, s.grad_year,
            (SELECT COUNT(*)::int FROM applications a WHERE a.student_id = s.student_id) AS applications
     FROM students s
     WHERE s.user_id = $1`,
    [session.userId],
  );

  return (
    <main className="mx-auto max-w-5xl space-y-6 px-6 py-10">
      <h1 className="text-3xl font-bold tracking-tight">Welcome, {profile?.full_name}</h1>
      <section className="card grid grid-cols-2 gap-4 sm:grid-cols-5">
        <Info label="USN" value={profile?.usn} />
        <Info label="Branch" value={profile?.branch} />
        <Info label="CGPA" value={profile?.cgpa} />
        <Info label="Graduating" value={profile?.grad_year ?? "—"} />
        <Info label="Applications" value={profile?.applications} />
      </section>
      <p className="opacity-70">Recommended jobs, job search and applying are coming in step 5.</p>
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
