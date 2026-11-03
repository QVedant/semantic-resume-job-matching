// Small shared values, safe to import from both server and browser code.

export const BRANCHES = ["CSE", "ISE", "AIML", "ECE", "EEE", "ME"] as const;
export type Branch = (typeof BRANCHES)[number];

// Values of the interview_round_type ENUM in schema.sql.
export const ROUND_TYPES = ["ONLINE_TEST", "GD", "TECHNICAL_INTERVIEW", "HR_INTERVIEW", "OFFER"] as const;

// How important a required skill is -> job_skills.weight (0..1).
export const SKILL_IMPORTANCE = [
  { label: "Nice to have", weight: 0.3 },
  { label: "Important", weight: 0.6 },
  { label: "Essential", weight: 0.9 },
] as const;

// Today's date as YYYY-MM-DD in the server's local time zone.
export function todayIso(): string {
  return new Date().toLocaleDateString("en-CA");
}

// Resume texts and job descriptions are limited to 300 words: about the most
// the embedding model reads in one pass. The database enforces the same limit
// (CHECK word_count(...) <= 300 in sql/embeddings_alter.sql).
export const MAX_TEXT_WORDS = 300;

// Counts words the same way as the SQL function word_count(): runs of
// characters separated by whitespace.
export function countWords(text: string): number {
  const trimmed = text.trim();
  return trimmed ? trimmed.split(/\s+/).length : 0;
}
