// Display helpers shared by pages. Safe for server and browser code.

// 1800000 -> "₹18.0 LPA" (lakhs per annum, how campus offers are quoted).
export function formatCtc(ctc: number | string | null | undefined): string {
  if (ctc === null || ctc === undefined) return "Not disclosed";
  return `₹${(Number(ctc) / 100000).toFixed(1)} LPA`;
}

// 0.6881 -> "69%"
export function formatPercent(score: number | string | null | undefined): string {
  if (score === null || score === undefined) return "—";
  return `${Math.round(Number(score) * 100)}%`;
}

// "2026-12-02" or a Date -> "2 Dec 2026"
export function formatDate(value: string | Date | null | undefined): string {
  if (!value) return "—";
  const date = value instanceof Date ? value : new Date(value);
  return date.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

// Tailwind classes for an application status badge.
export const STATUS_STYLE: Record<string, string> = {
  APPLIED: "bg-blue-500/15 text-blue-700 dark:text-blue-300",
  SHORTLISTED: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
  OFFERED: "bg-green-500/15 text-green-700 dark:text-green-300",
  HIRED: "bg-green-600/20 text-green-800 dark:text-green-200",
  REJECTED: "bg-red-500/15 text-red-700 dark:text-red-300",
  WITHDRAWN: "bg-gray-500/15 text-gray-700 dark:text-gray-300",
};
