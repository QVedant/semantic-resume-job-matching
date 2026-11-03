// Application-level input validation with zod.
// Every API route checks its input against one of these schemas BEFORE
// touching the database. The database still has its own CHECK / UNIQUE /
// NOT NULL rules as a second layer, so bad data is stopped twice.
import { z } from "zod";
import { BRANCHES } from "@/lib/constants";

// Emails are trimmed and lower-cased so "Aarav@PES.edu " and "aarav@pes.edu"
// count as the same account.
const email = z
  .string()
  .trim()
  .toLowerCase()
  .pipe(z.email("Enter a valid email address"));

// bcrypt only uses the first 72 bytes of a password, so longer ones are refused.
const newPassword = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .max(72, "Password must be at most 72 characters");

const fullName = z
  .string()
  .trim()
  .min(2, "Enter your full name")
  .max(150, "Name is too long");

const studentRegister = z.object({
  role: z.literal("STUDENT"),
  email,
  password: newPassword,
  full_name: fullName,
  // PES USN format, e.g. PES2UG23CS001
  usn: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^PES[12]UG\d{2}[A-Z]{2}\d{3}$/, "USN must look like PES2UG23CS001"),
  branch: z.enum(BRANCHES, "Choose your branch"),
  // Same limits as the database CHECK constraints (chk_student_cgpa, chk_student_grad_year)
  cgpa: z.coerce
    .number("CGPA must be a number")
    .min(0, "CGPA must be between 0 and 10")
    .max(10, "CGPA must be between 0 and 10"),
  grad_year: z.coerce
    .number("Graduation year must be a number")
    .int("Graduation year must be a whole number")
    .min(2000, "Enter a realistic graduation year")
    .max(2100, "Enter a realistic graduation year"),
});

const recruiterRegister = z.object({
  role: z.literal("RECRUITER"),
  email,
  password: newPassword,
  full_name: fullName,
  company_name: z.string().trim().min(2, "Enter your company's name").max(255, "Company name is too long"),
  designation: z.string().trim().max(100, "Designation is too long").optional().default(""),
});

// Only students and recruiters can sign up themselves. Placement officer
// accounts are created by the college (seed data), never through the website.
export const registerSchema = z.discriminatedUnion("role", [studentRegister, recruiterRegister], {
  error: "Choose whether you are a student or a recruiter",
});

export const loginSchema = z.object({
  email,
  password: z.string().min(1, "Enter your password"),
});

export type RegisterInput = z.infer<typeof registerSchema>;

// Turns zod's list of problems into { fieldName: "first message" } so each
// form field can show its own error.
export function fieldErrors(error: z.ZodError): Record<string, string> {
  const result: Record<string, string> = {};
  for (const issue of error.issues) {
    const field = String(issue.path[0] ?? "form");
    if (!result[field]) result[field] = issue.message;
  }
  return result;
}
