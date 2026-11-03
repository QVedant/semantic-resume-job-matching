import { NextResponse } from "next/server";
import { setSessionCookie, verifyPassword } from "@/lib/auth";
import { query } from "@/lib/db";
import { ROLE_HOME, type Role } from "@/lib/session";
import { fieldErrors, loginSchema } from "@/lib/validation";

type UserRow = {
  user_id: number;
  email: string;
  password_hash: string;
  role: Role;
};

// POST /api/auth/login
export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = loginSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Please fix the highlighted fields.", fieldErrors: fieldErrors(parsed.error) },
      { status: 400 },
    );
  }
  const { email, password } = parsed.data;

  // Parameterized query: the email is sent separately as $1, so input like
  // ' OR '1'='1 is treated as an (odd) email address, never as SQL.
  const [user] = await query<UserRow>(
    `SELECT user_id, email, password_hash, role FROM users WHERE email = $1`,
    [email],
  );

  // The same message for "no such email" and "wrong password", so the login
  // form cannot be used to discover which emails have accounts.
  if (!user || !(await verifyPassword(password, user.password_hash))) {
    return NextResponse.json({ error: "Invalid email or password." }, { status: 401 });
  }

  await setSessionCookie({ userId: user.user_id, email: user.email, role: user.role });
  return NextResponse.json({ redirectTo: ROLE_HOME[user.role] });
}
