import type { ReactNode } from "react";
import AppShell from "@/components/shell/AppShell";

// Every /student/... page: sidebar + content. AppShell also re-checks the
// role (middleware.ts already blocks non-students; this is a second line of defence).
export default function StudentLayout({ children }: { children: ReactNode }) {
  return <AppShell role="STUDENT">{children}</AppShell>;
}
