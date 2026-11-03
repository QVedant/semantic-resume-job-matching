"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/student", label: "Dashboard" },
  { href: "/student/recommended", label: "Recommended" },
  { href: "/student/jobs", label: "Browse jobs" },
  { href: "/student/applications", label: "My applications" },
  { href: "/student/resume", label: "My resume" },
];

// Section menu for students. Client component only because it highlights
// the current page (usePathname reads the browser's address).
export default function StudentNav() {
  const pathname = usePathname();
  return (
    <nav className="flex flex-wrap gap-1 border-b border-black/10 pb-3 dark:border-white/15">
      {LINKS.map((link) => {
        const active =
          link.href === "/student" ? pathname === "/student" : pathname.startsWith(link.href);
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
