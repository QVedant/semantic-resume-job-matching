import { NextResponse } from "next/server";
import { createJob, requireApiRecruiter } from "@/lib/recruiter";
import { fieldErrors, jobSchema } from "@/lib/validation";

// POST /api/recruiter/jobs: post a new job (saved with its skills, rounds and
// AI embedding in one transaction; see createJob in lib/recruiter.ts).
export async function POST(request: Request) {
  const recruiter = await requireApiRecruiter();
  if (recruiter instanceof NextResponse) return recruiter;

  const body = await request.json().catch(() => null);
  const parsed = jobSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Please fix the highlighted fields.", fieldErrors: fieldErrors(parsed.error) },
      { status: 400 },
    );
  }

  try {
    const jobId = await createJob(recruiter, parsed.data);
    return NextResponse.json({ jobId, redirectTo: `/recruiter/jobs/${jobId}` }, { status: 201 });
  } catch (error) {
    console.error("Posting job failed:", error);
    return NextResponse.json({ error: "Could not post the job. Please try again." }, { status: 500 });
  }
}
