import type { ReactNode } from "react";
import AppShell from "@/components/shell/AppShell";

// Every /officer/... page: sidebar + content (AppShell re-checks the role).
export default function OfficerLayout({ children }: { children: ReactNode }) {
  return <AppShell role="PLACEMENT_OFFICER">{children}</AppShell>;
}
