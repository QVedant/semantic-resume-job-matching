import { NextResponse } from "next/server";
import { parseId, requireApiRecruiter, setJobStatus } from "@/lib/recruiter";
import { fieldErrors, jobStatusSchema } from "@/lib/validation";

type Context = { params: Promise<{ id: string }> };

// PATCH /api/recruiter/jobs/7   body: { "status": "OPEN" | "CLOSED" }
// Publish a draft or close a job (only the recruiter's own jobs).
export async function PATCH(request: Request, { params }: Context) {
  const recruiter = await requireApiRecruiter();
  if (recruiter instanceof NextResponse) return recruiter;

  const jobId = parseId((await params).id);
  if (!jobId) return NextResponse.json({ error: "Invalid job id." }, { status: 400 });

  const parsed = jobStatusSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request.", fieldErrors: fieldErrors(parsed.error) }, { status: 400 });
  }

  const outcome = await setJobStatus(recruiter.recruiterId, jobId, parsed.data.status);
  if (outcome === "not_found") return NextResponse.json({ error: "Job not found." }, { status: 404 });
  if (outcome === "not_allowed") {
    return NextResponse.json(
      { error: parsed.data.status === "OPEN" ? "Only draft jobs can be published." : "This job is already closed." },
      { status: 409 },
    );
  }
  return NextResponse.json({ ok: true, status: parsed.data.status });
}
