"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

// "use client" = this component runs in the browser, because it reacts to a click.
export default function LogoutButton({ className = "" }: { className?: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function logout() {
    setBusy(true);
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/");
    router.refresh(); // re-render server components so the page forgets the user
  }

  return (
    <button type="button" onClick={logout} disabled={busy} className={`pill ${className}`}>
      {busy ? "Logging out…" : "Log out"}
    </button>
  );
}
