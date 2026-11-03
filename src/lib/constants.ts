// Small shared values, safe to import from both server and browser code.

export const BRANCHES = ["CSE", "ISE", "AIML", "ECE", "EEE", "ME"] as const;
export type Branch = (typeof BRANCHES)[number];

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
