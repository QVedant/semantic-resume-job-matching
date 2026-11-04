import Link from "next/link";
import JobRow from "@/components/student/JobCard";
import EmptyState from "@/components/ui/EmptyState";
import PageHeader from "@/components/ui/PageHeader";
import { requireStudent } from "@/lib/auth";
import { searchJobs } from "@/lib/jobs";

type Props = { searchParams: Promise<{ eligible?: string }> };

// Recommended jobs: every open job ranked by how close its meaning is to the
// student's resume (pgvector cosine similarity), split into the ones the
// student can apply to and the ones the eligibility rules block.
export default async function RecommendedPage({ searchParams }: Props) {
  const { studentId } = await requireStudent();
  const eligibleOnly = (await searchParams).eligible === "1";
  const jobs = await searchJobs(studentId, { mode: "recommended", eligibleOnly });
  const canApply = jobs.filter((job) => job.eligible && !job.already_applied);
  const applied = jobs.filter((job) => job.already_applied);
  const blocked = jobs.filter((job) => !job.eligible && !job.already_applied);

  const segment = (active: boolean) =>
    `rounded-full px-3.5 py-1.5 text-sm transition ${active ? "bg-ink font-medium text-on-ink" : "text-muted hover:text-foreground"}`;

  return (
    <main>
      <PageHeader
        title="Recommended"
        accent="for you"
        description={
          <>
            <strong>{jobs.length}</strong> open jobs, ranked by how closely they match the meaning of your resume ·{" "}
            <strong>{canApply.length}</strong> you can apply to
          </>
        }
        actions={
          <div className="flex rounded-full border border-line-strong bg-surface p-1">
            <Link href="/student/recommended" className={segment(!eligibleOnly)}>
              All
            </Link>
            <Link href="/student/recommended?eligible=1" className={segment(eligibleOnly)}>
              Eligible only
            </Link>
          </div>
        }
      />

      {jobs.length === 0 ? (
        <EmptyState title="No jobs to show">
          {eligibleOnly ? "No open job fits your CGPA and branch right now." : "There are no open jobs right now."}
        </EmptyState>
      ) : (
        <div className="card overflow-hidden p-0">
          {[
            { label: "You can apply", list: canApply },
            { label: "Already applied", list: applied },
            { label: "Not eligible", list: blocked },
          ]
            .filter((group) => group.list.length > 0)
            .map((group, index) => (
              <section key={group.label} className={index > 0 ? "border-t border-line" : ""}>
                <h2 className="section-label px-5 pt-4 pb-1">{group.label}</h2>
                <ul className="divide-y divide-line">
                  {group.list.map((job) => (
                    <JobRow key={job.job_id} job={job} scoreLabel="fit" />
                  ))}
                </ul>
              </section>
            ))}
        </div>
      )}
    </main>
  );
}
