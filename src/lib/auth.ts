// Server-side authentication helpers: password hashing, the session cookie,
// and role checks for pages and API routes.
import { compare, hash } from "bcryptjs";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import {
  ROLE_HOME,
  SESSION_COOKIE,
  SESSION_MAX_AGE,
  signSession,
  verifySession,
  type Role,
  type Session,
} from "@/lib/session";

// bcrypt turns a password into a one-way scrambled string like "$2b$10$...".
// 10 = cost factor: each hash takes ~100 ms on purpose, which makes guessing
// millions of passwords impractically slow. A random salt is built in, so two
// users with the same password still get different hashes.
export async function hashPassword(password: string): Promise<string> {
  return hash(password, 10);
}

// Checks a typed password against a stored hash. Also accepts the "$2a$"
// hashes that seed.sql created with PostgreSQL's pgcrypto (same algorithm).
export async function verifyPassword(password: string, passwordHash: string): Promise<boolean> {
  return compare(password, passwordHash);
}

// Stores the signed token in a cookie the browser sends back on every request.
//   httpOnly : JavaScript in the page cannot read it (protects against XSS theft)
//   sameSite : not sent on requests started by other websites (CSRF protection)
//   secure   : HTTPS-only in production
export async function setSessionCookie(session: Session): Promise<void> {
  const token = await signSession(session);
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_MAX_AGE,
  });
}

export async function clearSessionCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
}

// The logged-in user's session, or null if nobody is logged in.
export async function getSession(): Promise<Session | null> {
  const cookieStore = await cookies();
  return verifySession(cookieStore.get(SESSION_COOKIE)?.value);
}

// For pages: returns the session if the user has `role`; otherwise sends them
// to the login page (not logged in) or to their own dashboard (wrong role).
// middleware.ts already guards these pages; this is a second line of defence.
export async function requireRole(role: Role): Promise<Session> {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role !== role) redirect(ROLE_HOME[session.role]);
  return session;
}

// For API routes: returns the session, or a ready-made 401/403 JSON response.
//   const auth = await requireApiRole("STUDENT");
//   if (auth instanceof NextResponse) return auth;
export async function requireApiRole(...roles: Role[]): Promise<Session | NextResponse> {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Please log in first." }, { status: 401 });
  }
  if (!roles.includes(session.role)) {
    return NextResponse.json({ error: "You are not allowed to do this." }, { status: 403 });
  }
  return session;
}

// The display name of the logged-in user, read from their role's profile table.
export async function getDisplayName(session: Session): Promise<string> {
  const table = {
    STUDENT: "students",
    RECRUITER: "recruiters",
    PLACEMENT_OFFICER: "placement_officers",
  }[session.role];
  // The table name comes from the fixed map above (never from user input), so
  // it is safe to put in the SQL text. The user id is still a $1 parameter.
  const [row] = await query<{ full_name: string }>(
    `SELECT full_name FROM ${table} WHERE user_id = $1`,
    [session.userId],
  );
  return row?.full_name ?? session.email;
}
