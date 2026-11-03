import type { ReactNode } from "react";
import OfficerNav from "@/components/officer/OfficerNav";
import { requireRole } from "@/lib/auth";

// Wraps every /officer/... page with the officer section menu.
export default async function OfficerLayout({ children }: { children: ReactNode }) {
  await requireRole("PLACEMENT_OFFICER");
  return (
    <div className="mx-auto max-w-6xl space-y-6 px-6 py-8">
      <OfficerNav />
      {children}
    </div>
  );
}
