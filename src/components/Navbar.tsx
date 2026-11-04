import Link from "next/link";
import { Brand } from "@/components/shell/TopBar";
import { getSession } from "@/lib/auth";
import { ROLE_HOME } from "@/lib/session";

// Top bar for the public pages (home, login, register).
export default async function Navbar() {
  const session = await getSession();

  return (
    <header className="border-b border-line bg-background">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
        <Brand />
        {session ? (
          <Link href={ROLE_HOME[session.role]} className="pill">
            My dashboard
          </Link>
        ) : (
          <div className="flex items-center gap-2">
            <Link href="/login" className="pill">
              Log in
            </Link>
            <Link href="/register" className="btn-primary rounded-full py-1.5">
              Create account
            </Link>
          </div>
        )}
      </div>
    </header>
  );
}
