import { NextResponse } from "next/server";
import { parseId, requireApiRecruiter, updateApplicationStatus } from "@/lib/recruiter";
import { applicantStatusSchema, fieldErrors } from "@/lib/validation";

type Context = { params: Promise<{ id: string }> };

// PATCH /api/recruiter/applications/12   body: { "status": "SHORTLISTED" }
// Shortlist / reject / offer / hire an applicant to one of the recruiter's jobs.
export async function PATCH(request: Request, { params }: Context) {
  const recruiter = await requireApiRecruiter();
  if (recruiter instanceof NextResponse) return recruiter;

  const applicationId = parseId((await params).id);
  if (!applicationId) return NextResponse.json({ error: "Invalid application id." }, { status: 400 });

  const parsed = applicantStatusSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request.", fieldErrors: fieldErrors(parsed.error) }, { status: 400 });
  }

  const outcome = await updateApplicationStatus(
    recruiter.recruiterId,
    recruiter.session.userId,
    applicationId,
    parsed.data.status,
  );
  if (outcome === "not_found") return NextResponse.json({ error: "Application not found." }, { status: 404 });
  if (outcome === "not_allowed") {
    return NextResponse.json(
      { error: `This application can't be moved to ${parsed.data.status} from its current status.` },
      { status: 409 },
    );
  }
  return NextResponse.json({ ok: true, status: parsed.data.status });
}
