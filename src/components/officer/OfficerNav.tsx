"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/officer", label: "Dashboard" },
  { href: "/officer/applications", label: "All applications" },
  { href: "/officer/students", label: "Students" },
];

// Section menu for placement officers (highlights the current page).
export default function OfficerNav() {
  const pathname = usePathname();
  return (
    <nav className="flex flex-wrap gap-1 border-b border-black/10 pb-3 dark:border-white/15">
      {LINKS.map((link) => {
        const active = link.href === "/officer" ? pathname === "/officer" : pathname.startsWith(link.href);
        return (
          <Link
            key={link.href}
            href={link.href}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
              active ? "bg-blue-600 text-white" : "hover:bg-black/5 dark:hover:bg-white/10"
            }`}
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
