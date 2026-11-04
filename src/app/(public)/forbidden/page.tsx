import Link from "next/link";
import { getSession } from "@/lib/auth";
import { ROLE_HOME, ROLE_LABEL } from "@/lib/session";

// Shown by middleware.ts (with HTTP status 403) when a logged-in user opens
// another role's section, e.g. a student visiting /recruiter.
export default async function ForbiddenPage() {
  const session = await getSession();

  return (
    <main className="mx-auto max-w-lg px-4 py-16">
      <span className="chip chip-red">403</span>
      <h1 className="mt-3 font-display text-5xl leading-[1.05]">
        Not your <em className="text-accent-ink">page</em>
      </h1>
      <p className="mt-3 mb-7 text-[15px] text-muted">
        {session
          ? `You're logged in as a ${ROLE_LABEL[session.role].toLowerCase()}, and this page belongs to a different role.`
          : "You don't have permission to view this page."}
      </p>
      <Link href={session ? ROLE_HOME[session.role] : "/"} className="btn-primary">
        {session ? "Back to my dashboard" : "Go to the home page"}
      </Link>
    </main>
  );
}
