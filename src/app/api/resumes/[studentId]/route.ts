import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getResumePdfForViewer } from "@/lib/resumeFiles";

type Context = { params: Promise<{ studentId: string }> };

// GET /api/resumes/7: streams student 7's resume PDF, if the logged-in user
// may see it (rules in getResumePdfForViewer). Anyone else gets the same 404
// as for a missing file, so the response doesn't reveal whether a file exists.
export async function GET(_request: Request, { params }: Context) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Please log in first." }, { status: 401 });

  const studentId = Number((await params).studentId);
  if (!Number.isInteger(studentId) || studentId <= 0) {
    return NextResponse.json({ error: "Invalid student id." }, { status: 400 });
  }

  const file = await getResumePdfForViewer(session, studentId);
  if (!file) return NextResponse.json({ error: "Resume not found." }, { status: 404 });

  const asciiName = file.file_name.replace(/[^\w.\- ()]/g, "_");
  return new NextResponse(new Uint8Array(file.content), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${asciiName}"`, // open in the browser's PDF viewer
      "X-Content-Type-Options": "nosniff", // never treat it as anything but a PDF
      "Cache-Control": "private, no-store", // personal data: don't cache
    },
  });
}
