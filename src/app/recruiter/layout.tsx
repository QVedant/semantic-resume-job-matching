import type { ReactNode } from "react";
import RecruiterNav from "@/components/recruiter/RecruiterNav";
import { requireRole } from "@/lib/auth";

// Wraps every /recruiter/... page with the recruiter section menu.
export default async function RecruiterLayout({ children }: { children: ReactNode }) {
  await requireRole("RECRUITER");
  return (
    <div className="mx-auto max-w-5xl space-y-6 px-6 py-8">
      <RecruiterNav />
      {children}
    </div>
  );
}
