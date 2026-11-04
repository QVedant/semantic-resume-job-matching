import JobForm from "@/components/recruiter/JobForm";
import PageHeader from "@/components/ui/PageHeader";
import { allSkills, requireRecruiter } from "@/lib/recruiter";

export default async function NewJobPage() {
  const { companyName } = await requireRecruiter();
  const skills = await allSkills();

  return (
    <main className="max-w-4xl">
      <PageHeader
        title="Post a"
        accent="job"
        description={
          <>
            For <strong>{companyName}</strong>. The description is analysed by the AI model so it can be matched
            against every student&apos;s resume.
          </>
        }
      />
      <JobForm skills={skills} />
    </main>
  );
}
