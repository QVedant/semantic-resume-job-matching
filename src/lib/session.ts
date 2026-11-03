// Session tokens ("wristbands"): create and verify signed JWTs.
// This file only uses `jose`, which also runs in middleware (the Edge
// runtime), so the route guard can import it. Password hashing and database
// access live in auth.ts instead, which middleware cannot use.
import { SignJWT, jwtVerify } from "jose";

export const SESSION_COOKIE = "session";
export const SESSION_MAX_AGE = 60 * 60 * 8; // 8 hours, in seconds

export const ROLES = ["STUDENT", "RECRUITER", "PLACEMENT_OFFICER"] as const;
export type Role = (typeof ROLES)[number];

export type Session = {
  userId: number;
  email: string;
  role: Role;
};

// Where each role lands after logging in.
export const ROLE_HOME: Record<Role, string> = {
  STUDENT: "/student",
  RECRUITER: "/recruiter",
  PLACEMENT_OFFICER: "/officer",
};

export const ROLE_LABEL: Record<Role, string> = {
  STUDENT: "Student",
  RECRUITER: "Recruiter",
  PLACEMENT_OFFICER: "Placement Officer",
};

// The placeholder from .env.example. It is public on GitHub, so it must
// never be used as the real secret.
const EXAMPLE_SECRET = "replace-with-a-long-random-string";

// The secret key that signs every token. Anyone who knows it could forge a
// login, so it lives only in .env (JWT_SECRET), never in the code.
function getSecret(): Uint8Array {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.length < 32 || secret === EXAMPLE_SECRET) {
    throw new Error(
      "JWT_SECRET in .env must be your own random string of at least 32 characters (not the example value).",
    );
  }
  return new TextEncoder().encode(secret);
}

// Creates a signed token that says "user N, role R" and expires after 8 hours.
// The token is readable but tamper-proof: changing the role inside it breaks
// the signature, and verifySession() then rejects it.
export async function signSession(session: Session): Promise<string> {
  return new SignJWT({ email: session.email, role: session.role })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(String(session.userId))
    .setIssuedAt()
    .setExpirationTime(`${SESSION_MAX_AGE}s`)
    .sign(getSecret());
}

// Returns the session inside a token, or null if the token is missing,
// expired, forged or malformed.
export async function verifySession(token: string | undefined): Promise<Session | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, getSecret(), { algorithms: ["HS256"] });
    const role = payload.role;
    if (typeof role !== "string" || !ROLES.includes(role as Role)) return null;
    return { userId: Number(payload.sub), email: String(payload.email), role: role as Role };
  } catch {
    return null;
  }
}
