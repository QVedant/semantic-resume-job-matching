import type { ReactNode } from "react";
import StudentNav from "@/components/student/StudentNav";
import { requireRole } from "@/lib/auth";

// Wraps every /student/... page with the student section menu.
// (middleware.ts already blocks non-students; this re-check is a second line of defence.)
export default async function StudentLayout({ children }: { children: ReactNode }) {
  await requireRole("STUDENT");
  return (
    <div className="mx-auto max-w-5xl space-y-6 px-6 py-8">
      <StudentNav />
      {children}
    </div>
  );
}
