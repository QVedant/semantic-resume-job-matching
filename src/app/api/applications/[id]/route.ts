import { NextResponse } from "next/server";
import { withdrawApplication } from "@/lib/applications";
import { requireApiRole, studentIdForUser } from "@/lib/auth";
import { fieldErrors, withdrawSchema } from "@/lib/validation";

type Context = { params: Promise<{ id: string }> };

// PATCH /api/applications/12   body: { "status": "WITHDRAWN" }
// A student withdraws one of their own applications.
export async function PATCH(request: Request, { params }: Context) {
  const auth = await requireApiRole("STUDENT");
  if (auth instanceof NextResponse) return auth;

  const applicationId = Number((await params).id);
  if (!Number.isInteger(applicationId) || applicationId <= 0) {
    return NextResponse.json({ error: "Invalid application id." }, { status: 400 });
  }

  const body = await request.json().catch(() => null);
  const parsed = withdrawSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request.", fieldErrors: fieldErrors(parsed.error) }, { status: 400 });
  }

  const studentId = await studentIdForUser(auth.userId);
  if (!studentId) return NextResponse.json({ error: "Student profile not found." }, { status: 404 });

  const outcome = await withdrawApplication(studentId, applicationId);
  if (outcome === "not_found") {
    return NextResponse.json({ error: "Application not found." }, { status: 404 });
  }
  if (outcome === "not_allowed") {
    return NextResponse.json(
      { error: "Only applications that are still Applied or Shortlisted can be withdrawn." },
      { status: 409 },
    );
  }
  return NextResponse.json({ ok: true, status: "WITHDRAWN" });
}
