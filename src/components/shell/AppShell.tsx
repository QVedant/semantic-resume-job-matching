import type { ReactNode } from "react";
import { getDisplayName, requireRole } from "@/lib/auth";
import type { Role } from "@/lib/session";
import TopBar from "./TopBar";

// The frame of every logged-in page: top bar, then the page on a dot grid.
// Also re-checks the role (middleware.ts already did; second line of defence).
export default async function AppShell({ role, children }: { role: Role; children: ReactNode }) {
  const session = await requireRole(role);
  const name = await getDisplayName(session);

  return (
    <div className="flex min-h-screen flex-col">
      <TopBar role={role} name={name} />
      <div className="dot-grid flex-1">
        <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">{children}</div>
      </div>
    </div>
  );
}
