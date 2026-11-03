import JobForm from "@/components/recruiter/JobForm";
import { allSkills, requireRecruiter } from "@/lib/recruiter";

export default async function NewJobPage() {
  const { companyName } = await requireRecruiter();
  const skills = await allSkills();

  return (
    <main className="space-y-5">
      <header className="space-y-1">
        <h1 className="text-3xl font-bold tracking-tight">Post a job</h1>
        <p className="opacity-70">
          Posting for <strong>{companyName}</strong>. When you save, the description is analysed by
          the AI model so it can be matched against every student&apos;s resume.
        </p>
      </header>
      <JobForm skills={skills} />
    </main>
  );
}
