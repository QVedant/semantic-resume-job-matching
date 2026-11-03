// Application-level input validation with zod.
// Every API route checks its input against one of these schemas BEFORE
// touching the database. The database still has its own CHECK / UNIQUE /
// NOT NULL rules as a second layer, so bad data is stopped twice.
import { z } from "zod";
import { BRANCHES, MAX_TEXT_WORDS, ROUND_TYPES, countWords, todayIso } from "@/lib/constants";

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

export const applySchema = z.object({
  job_id: z.coerce.number("Choose a job").int().positive("Choose a job"),
});

// The only change a student may make to their own application.
export const withdrawSchema = z.object({
  status: z.literal("WITHDRAWN", "Students can only withdraw an application"),
});

// A recruiter's new job posting. Limits mirror the database rules:
// chk_job_ctc, chk_job_min_cgpa, chk_skill_weight, chk_job_description_words.
export const jobSchema = z.object({
  title: z.string().trim().min(3, "Enter a job title").max(200, "Title is too long"),
  description: z
    .string()
    .trim()
    .refine((text) => countWords(text) >= 20, "Describe the role in at least 20 words")
    .refine((text) => countWords(text) <= MAX_TEXT_WORDS, `Description must be ${MAX_TEXT_WORDS} words or fewer`),
  location: z.string().trim().min(2, "Enter a location").max(150, "Location is too long"),
  ctc_lpa: z.coerce
    .number("CTC must be a number")
    .positive("CTC must be more than 0")
    .max(999, "CTC looks too large (enter it in lakhs per annum)"),
  min_cgpa: z.coerce.number("Minimum CGPA must be a number").min(0, "Between 0 and 10").max(10, "Between 0 and 10"),
  eligible_branches: z.array(z.enum(BRANCHES)).min(1, "Choose at least one eligible branch"),
  deadline: z.iso.date("Choose a deadline").refine((date) => date >= todayIso(), "The deadline can't be in the past"),
  status: z.enum(["OPEN", "DRAFT"]),
  skills: z
    .array(z.object({ skill_id: z.coerce.number().int().positive(), weight: z.coerce.number().min(0).max(1) }))
    .min(1, "Add at least one required skill")
    .max(10, "At most 10 skills")
    .refine((skills) => new Set(skills.map((s) => s.skill_id)).size === skills.length, "Each skill only once"),
  rounds: z
    .array(
      z.object({
        round_name: z.string().trim().min(2, "Name each round").max(100, "Round name is too long"),
        round_type: z.enum(ROUND_TYPES),
      }),
    )
    .max(6, "At most 6 rounds"),
});
export type JobInput = z.infer<typeof jobSchema>;

export const jobStatusSchema = z.object({
  status: z.enum(["OPEN", "CLOSED"], "Status must be OPEN or CLOSED"),
});

export const applicantStatusSchema = z.object({
  status: z.enum(["SHORTLISTED", "REJECTED", "OFFERED", "HIRED"], "Invalid status"),
});

export const roundResultSchema = z.object({
  round_id: z.coerce.number().int().positive(),
  result: z.enum(["PASSED", "REJECTED"], "Result must be PASSED or REJECTED"),
  feedback: z.string().trim().max(500, "Feedback is too long").optional().default(""),
});

// Resume text: at least a sentence, at most 300 words (same limit as the
// database CHECK chk_student_resume_words).
export const resumeSchema = z.object({
  resume_text: z
    .string()
    .trim()
    .refine((text) => countWords(text) >= 20, "Write at least 20 words about your skills and experience")
    .refine(
      (text) => countWords(text) <= MAX_TEXT_WORDS,
      `Resume must be ${MAX_TEXT_WORDS} words or fewer`,
    ),
});

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
