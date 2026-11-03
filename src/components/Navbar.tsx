import Link from "next/link";
import { getDisplayName, getSession } from "@/lib/auth";
import { ROLE_HOME, ROLE_LABEL } from "@/lib/session";
import LogoutButton from "./LogoutButton";

// Server component: reads the session cookie on the server and shows either
// the logged-in user's name + role, or Login / Register links.
export default async function Navbar() {
  const session = await getSession();
  const name = session ? await getDisplayName(session) : null;

  return (
    <nav className="border-b border-black/10 dark:border-white/15">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-6 py-3">
        <Link href="/" className="font-semibold tracking-tight">
          Semantic Job Match
        </Link>
        {session ? (
          <div className="flex items-center gap-3 text-sm">
            <Link href={ROLE_HOME[session.role]} className="hover:underline">
              Dashboard
            </Link>
            <span className="hidden opacity-70 sm:inline">
              {name} · {ROLE_LABEL[session.role]}
            </span>
            <LogoutButton />
          </div>
        ) : (
          <div className="flex items-center gap-3 text-sm">
            <Link href="/login" className="hover:underline">
              Log in
            </Link>
            <Link href="/register" className="btn-primary px-3 py-1.5 text-sm">
              Register
            </Link>
          </div>
        )}
      </div>
    </nav>
  );
}
