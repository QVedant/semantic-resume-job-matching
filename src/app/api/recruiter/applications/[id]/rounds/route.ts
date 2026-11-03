import { NextResponse } from "next/server";
import { parseId, recordRoundResult, requireApiRecruiter } from "@/lib/recruiter";
import { fieldErrors, roundResultSchema } from "@/lib/validation";

type Context = { params: Promise<{ id: string }> };

// POST /api/recruiter/applications/12/rounds
//   body: { "round_id": 2, "result": "PASSED", "feedback": "Strong problem solving" }
// Records an interview round result; passing queues the next round (one transaction).
export async function POST(request: Request, { params }: Context) {
  const recruiter = await requireApiRecruiter();
  if (recruiter instanceof NextResponse) return recruiter;

  const applicationId = parseId((await params).id);
  if (!applicationId) return NextResponse.json({ error: "Invalid application id." }, { status: 400 });

  const parsed = roundResultSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request.", fieldErrors: fieldErrors(parsed.error) }, { status: 400 });
  }

  const { round_id, result, feedback } = parsed.data;
  const outcome = await recordRoundResult(
    recruiter.recruiterId,
    recruiter.session.userId,
    applicationId,
    round_id,
    result,
    feedback || null,
  );
  if (outcome === "not_found") {
    return NextResponse.json({ error: "Application or round not found." }, { status: 404 });
  }
  if (outcome === "out_of_order") {
    return NextResponse.json({ error: "Record the earlier rounds first: rounds go in order." }, { status: 409 });
  }
  if (outcome === "not_allowed") {
    return NextResponse.json(
      { error: "Round results can only be recorded while the application is Applied or Shortlisted." },
      { status: 409 },
    );
  }
  return NextResponse.json({ ok: true });
}
