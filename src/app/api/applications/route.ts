import { NextResponse } from "next/server";
import { applyToJob, describeApplyError } from "@/lib/applications";
import { requireApiRole, studentIdForUser } from "@/lib/auth";
import { applySchema, fieldErrors } from "@/lib/validation";

// POST /api/applications   body: { "job_id": 3 }
// The logged-in student applies to a job. Eligibility is NOT checked here:
// the database trigger trg_check_eligibility decides, inside the transaction
// in applyToJob(), and its message ("Not eligible: CGPA 7.35 is below ...")
// is passed straight back to the student.
export async function POST(request: Request) {
  const auth = await requireApiRole("STUDENT");
  if (auth instanceof NextResponse) return auth;

  const body = await request.json().catch(() => null);
  const parsed = applySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request.", fieldErrors: fieldErrors(parsed.error) }, { status: 400 });
  }

  const studentId = await studentIdForUser(auth.userId);
  if (!studentId) return NextResponse.json({ error: "Student profile not found." }, { status: 404 });

  try {
    const result = await applyToJob(studentId, parsed.data.job_id);
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    const known = describeApplyError(error);
    if (known) return NextResponse.json({ error: known.message }, { status: known.status });
    console.error("Apply failed:", error);
    return NextResponse.json({ error: "Could not apply. Please try again." }, { status: 500 });
  }
}
