// Route guard ("the bouncer"). Runs before every matching page request and
// decides, from the signed session cookie alone, whether the visitor may in:
//   not logged in            -> sent to /login (and back here after logging in)
//   logged in, wrong role    -> shown the 403 "Access denied" page
//   logged in, right role    -> allowed through
// API routes check roles themselves with requireApiRole() in lib/auth.ts.
import { NextResponse, type NextRequest } from "next/server";
import { ROLE_HOME, SESSION_COOKIE, verifySession, type Role } from "@/lib/session";

// Which role owns which section of the site.
const PROTECTED_AREAS: { prefix: string; role: Role }[] = [
  { prefix: "/student", role: "STUDENT" },
  { prefix: "/recruiter", role: "RECRUITER" },
  { prefix: "/officer", role: "PLACEMENT_OFFICER" },
];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const session = await verifySession(request.cookies.get(SESSION_COOKIE)?.value);

  // Already logged in: skip the login/register pages, go to your dashboard.
  if (session && (pathname === "/login" || pathname === "/register")) {
    return NextResponse.redirect(new URL(ROLE_HOME[session.role], request.url));
  }

  const area = PROTECTED_AREAS.find(
    (a) => pathname === a.prefix || pathname.startsWith(`${a.prefix}/`),
  );
  if (!area) return NextResponse.next();

  if (!session) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (session.role !== area.role) {
    // Show the "Access denied" page without changing the address bar.
    return NextResponse.rewrite(new URL("/forbidden", request.url), { status: 403 });
  }

  return NextResponse.next();
}

// Only run the guard on these paths (everything else is public).
export const config = {
  matcher: ["/student/:path*", "/recruiter/:path*", "/officer/:path*", "/login", "/register"],
};
