import Link from "next/link";
import { getSession } from "@/lib/auth";
import { ROLE_HOME, ROLE_LABEL } from "@/lib/session";

// Shown by middleware.ts (with HTTP status 403) when a logged-in user opens
// another role's section, e.g. a student visiting /recruiter.
export default async function ForbiddenPage() {
  const session = await getSession();

  return (
    <main className="mx-auto max-w-md space-y-4 px-6 py-24 text-center">
      <p className="text-6xl font-bold opacity-30">403</p>
      <h1 className="text-2xl font-bold">Access denied</h1>
      <p className="opacity-70">
        {session
          ? `You are logged in as a ${ROLE_LABEL[session.role]}, and this page belongs to a different role.`
          : "You do not have permission to view this page."}
      </p>
      <Link href={session ? ROLE_HOME[session.role] : "/"} className="btn-primary">
        {session ? "Go to my dashboard" : "Go home"}
      </Link>
    </main>
  );
}
