import type { ReactNode } from "react";
import Navbar from "@/components/Navbar";

// Layout for the public pages: home, login, register, access denied.
// "(public)" is a route group: the folder name in brackets is NOT part of the
// web address, it only lets these pages share this layout.
export default function PublicLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <div className="dot-grid flex-1">{children}</div>
    </div>
  );
}
