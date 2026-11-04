import type { ReactNode } from "react";
import AppShell from "@/components/shell/AppShell";

// Every /recruiter/... page: sidebar + content (AppShell re-checks the role).
export default function RecruiterLayout({ children }: { children: ReactNode }) {
  return <AppShell role="RECRUITER">{children}</AppShell>;
}
