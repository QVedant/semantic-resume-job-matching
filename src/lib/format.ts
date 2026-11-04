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

// Monospace chip classes for an application status (colours from globals.css).
export const STATUS_STYLE: Record<string, string> = {
  APPLIED: "chip chip-blue",
  SHORTLISTED: "chip chip-amber",
  OFFERED: "chip chip-green",
  HIRED: "chip chip-violet",
  REJECTED: "chip chip-red",
  WITHDRAWN: "chip chip-gray",
};

// Monospace chip classes for a job status.
export const JOB_STATUS_STYLE: Record<string, string> = {
  OPEN: "chip chip-green",
  DRAFT: "chip chip-gray",
  CLOSED: "chip chip-red",
};

// Each company gets one of six label colours, chosen by its company_id, so
// the same company always has the same colour (like departments in a
// planner) and six companies in a row never share one.
const DEPT_TEXT = ["text-dept-1", "text-dept-2", "text-dept-3", "text-dept-4", "text-dept-5", "text-dept-6"];
const DEPT_BG = ["bg-dept-1", "bg-dept-2", "bg-dept-3", "bg-dept-4", "bg-dept-5", "bg-dept-6"];
const deptIndex = (companyId: number) => (((companyId - 1) % DEPT_TEXT.length) + DEPT_TEXT.length) % DEPT_TEXT.length;
export const companyText = (companyId: number) => DEPT_TEXT[deptIndex(companyId)];
export const companyDot = (companyId: number) => DEPT_BG[deptIndex(companyId)];

// Splits stored text into paragraphs for display: blank lines separate
// paragraphs, single line breaks inside a paragraph become spaces (so text
// typed with hard line breaks still flows nicely).
export function paragraphs(text: string | null | undefined): string[] {
  return (text ?? "")
    .split(/\n\s*\n/)
    .map((block) => block.replace(/\s+/g, " ").trim())
    .filter(Boolean);
}

// "2026-12-02" -> "2 Dec" (short form for chips)
export function formatShortDate(value: string | Date | null | undefined): string {
  if (!value) return "—";
  const date = value instanceof Date ? value : new Date(value);
  return date.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

// Classes for an interview round result.
export const RESULT_STYLE: Record<string, string> = {
  PASSED: "text-success",
  PENDING: "text-warning",
  REJECTED: "text-danger",
};
