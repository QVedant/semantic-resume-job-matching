import Link from "next/link";
import JobCard from "@/components/student/JobCard";
import { requireStudent } from "@/lib/auth";
import { searchJobs } from "@/lib/jobs";

type Props = { searchParams: Promise<{ eligible?: string }> };

// Recommended jobs: every open job ranked by how close its meaning is to the
// student's resume (pgvector cosine similarity), with eligibility labels.
export default async function RecommendedPage({ searchParams }: Props) {
  const { studentId } = await requireStudent();
  const eligibleOnly = (await searchParams).eligible === "1";
  const jobs = await searchJobs(studentId, { mode: "recommended", eligibleOnly });

  return (
    <main className="space-y-5">
      <header className="space-y-1">
        <h1 className="text-3xl font-bold tracking-tight">Recommended for you</h1>
        <p className="opacity-70">
          Open jobs ranked by how closely their description matches the <em>meaning</em> of your
          resume, not just shared keywords.
        </p>
      </header>

      <div className="flex gap-2 text-sm">
        <Link href="/student/recommended" className={eligibleOnly ? "btn-secondary py-1" : "btn-primary py-1"}>
          All open jobs
        </Link>
        <Link href="/student/recommended?eligible=1" className={eligibleOnly ? "btn-primary py-1" : "btn-secondary py-1"}>
          Only jobs I&apos;m eligible for
        </Link>
      </div>

      {jobs.length === 0 ? (
        <p className="opacity-70">No jobs to show.</p>
      ) : (
        <div className="space-y-3">
          {jobs.map((job) => (
            <JobCard key={job.job_id} job={job} similarityLabel="Resume fit" />
          ))}
        </div>
      )}
    </main>
  );
}
