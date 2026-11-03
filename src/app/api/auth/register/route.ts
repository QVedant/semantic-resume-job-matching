import { NextResponse } from "next/server";
import { hashPassword, setSessionCookie } from "@/lib/auth";
import { isUniqueViolation, withTransaction } from "@/lib/db";
import { ROLE_HOME } from "@/lib/session";
import { fieldErrors, registerSchema } from "@/lib/validation";

// POST /api/auth/register
// Creates a login account plus its role profile, then logs the user in.
export async function POST(request: Request) {
  // 1. Validate the input (application-level validation).
  const body = await request.json().catch(() => null);
  const parsed = registerSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Please fix the highlighted fields.", fieldErrors: fieldErrors(parsed.error) },
      { status: 400 },
    );
  }
  const data = parsed.data;

  // 2. Hash the password. Only the hash is stored, never the password itself.
  const passwordHash = await hashPassword(data.password);

  try {
    // 3. TRANSACTION: the users row and the profile row are saved together or
    //    not at all. If the profile INSERT fails (e.g. duplicate USN), the users
    //    row is rolled back too, so no half-registered account is left behind.
    const userId = await withTransaction(async (client) => {
      const userResult = await client.query<{ user_id: number }>(
        `INSERT INTO users (email, password_hash, role)
         VALUES ($1, $2, $3)
         RETURNING user_id`,
        [data.email, passwordHash, data.role],
      );
      const newUserId = userResult.rows[0].user_id;

      if (data.role === "STUDENT") {
        await client.query(
          `INSERT INTO students (user_id, usn, full_name, branch, cgpa, grad_year)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [newUserId, data.usn, data.full_name, data.branch, data.cgpa, data.grad_year],
        );
      } else {
        // Recruiter: reuse the company if it already exists (case-insensitive),
        // otherwise create it, all inside the same transaction.
        const existing = await client.query<{ company_id: number }>(
          `SELECT company_id FROM companies WHERE LOWER(name) = LOWER($1)`,
          [data.company_name],
        );
        const companyId =
          existing.rows[0]?.company_id ??
          (
            await client.query<{ company_id: number }>(
              `INSERT INTO companies (name) VALUES ($1) RETURNING company_id`,
              [data.company_name],
            )
          ).rows[0].company_id;

        await client.query(
          `INSERT INTO recruiters (user_id, company_id, full_name, designation)
           VALUES ($1, $2, $3, $4)`,
          [newUserId, companyId, data.full_name, data.designation || null],
        );
      }
      return newUserId;
    });

    // 4. Log the new user in straight away.
    await setSessionCookie({ userId, email: data.email, role: data.role });
    return NextResponse.json({ redirectTo: ROLE_HOME[data.role] }, { status: 201 });
  } catch (error) {
    // The database's UNIQUE constraints are the final judge of duplicates.
    if (isUniqueViolation(error, "users_email_key")) {
      const message = "An account with this email already exists.";
      return NextResponse.json({ error: message, fieldErrors: { email: message } }, { status: 409 });
    }
    if (isUniqueViolation(error, "students_usn_key")) {
      const message = "A student with this USN is already registered.";
      return NextResponse.json({ error: message, fieldErrors: { usn: message } }, { status: 409 });
    }
    console.error("Registration failed:", error);
    return NextResponse.json({ error: "Registration failed. Please try again." }, { status: 500 });
  }
}
