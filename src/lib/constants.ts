// Small shared values, safe to import from both server and browser code.

export const BRANCHES = ["CSE", "ISE", "AIML", "ECE", "EEE", "ME"] as const;
export type Branch = (typeof BRANCHES)[number];
