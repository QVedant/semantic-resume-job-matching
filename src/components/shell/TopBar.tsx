"use client";

import { Search } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import LogoutButton from "@/components/LogoutButton";
import type { Role } from "@/lib/session";

type Tab = { href: string; label: string; exact?: boolean };

// Each role's pages, shown as a segmented tab switcher. `exact` = only
// highlighted on that exact address.
const TABS: Record<Role, Tab[]> = {
  STUDENT: [
    { href: "/student", label: "Dashboard", exact: true },
    { href: "/student/recommended", label: "Recommended" },
    { href: "/student/jobs", label: "Jobs" },
    { href: "/student/applications", label: "Applications" },
    { href: "/student/resume", label: "Resume" },
  ],
  RECRUITER: [
    { href: "/recruiter", label: "Dashboard", exact: true },
    { href: "/recruiter/jobs", label: "My jobs" },
    { href: "/recruiter/jobs/new", label: "Post a job", exact: true },
  ],
  PLACEMENT_OFFICER: [
    { href: "/officer", label: "Overview", exact: true },
    { href: "/officer/applications", label: "Applications" },
    { href: "/officer/students", label: "Students" },
  ],
};

// The command bar under the tabs: one sentence in, results out.
const COMMAND: Partial<Record<Role, { action: string; placeholder: string; hint: string; button: string; extra?: Record<string, string> }>> = {
  STUDENT: {
    action: "/student/jobs",
    placeholder: "Describe the job you want… e.g. “building backend web services with Node.js and PostgreSQL”",
    hint: "Search by meaning: every open job is ranked by how close it is to what you write, even with no words in common.",
    button: "Search",
    extra: { mode: "meaning" },
  },
  PLACEMENT_OFFICER: {
    action: "/officer/applications",
    placeholder: "Find an application by student name, USN or job title",
    hint: "Searches every application on campus. Use the filters on the next page to narrow by company, branch or status.",
    button: "Find",
  },
};

function isActive(tab: Tab, pathname: string, tabs: Tab[]) {
  if (tab.exact) return pathname === tab.href;
  if (!pathname.startsWith(tab.href)) return false;
  // "My jobs" is not active on "/recruiter/jobs/new", which has its own tab.
  return !tabs.some((other) => other !== tab && other.exact && pathname === other.href);
}

export function Brand() {
  return (
    <Link href="/" className="font-display text-[28px] leading-none whitespace-nowrap text-foreground">
      Semantic Job <em className="text-primary">Match</em>
    </Link>
  );
}

// Top bar for logged-in pages: brand, the role's tabs, the user, and (for
// students and officers) a command bar.
export default function TopBar({ role, name }: { role: Role; name: string }) {
  const pathname = usePathname();
  const tabs = TABS[role];
  const command = COMMAND[role];

  const tabSwitcher = (
    <nav aria-label="Pages" className="flex w-max rounded-full border border-line-strong bg-surface p-1">
      {tabs.map((tab) => {
        const active = isActive(tab, pathname, tabs);
        return (
          <Link
            key={tab.href}
            href={tab.href}
            aria-current={active ? "page" : undefined}
            className={`rounded-full px-3.5 py-1.5 text-sm whitespace-nowrap transition ${
              active ? "bg-ink font-medium text-on-ink" : "text-muted hover:text-foreground"
            }`}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );

  return (
    <header className="border-b border-line bg-background">
      <div className="mx-auto max-w-6xl space-y-3 px-4 py-4 sm:px-6">
        <div className="flex items-center justify-between gap-6">
          <Brand />
          <div className="flex items-center gap-2">
            {/* Wide screens: tabs sit next to the brand. */}
            <div className="hidden md:block">{tabSwitcher}</div>
            <span className="pill hidden cursor-default hover:bg-surface lg:inline-flex" title="Logged in">
              {name}
            </span>
            <LogoutButton />
          </div>
        </div>
        {/* Phones: tabs get their own row, scrollable sideways. */}
        <div className="-mx-4 overflow-x-auto px-4 md:hidden">{tabSwitcher}</div>

        {command && (
          <form action={command.action} method="get" className="space-y-1.5">
            <div className="flex gap-2">
              <label htmlFor="command" className="sr-only">
                {command.placeholder}
              </label>
              <input id="command" name="q" className="input py-2.5" placeholder={command.placeholder} maxLength={300} />
              {Object.entries(command.extra ?? {}).map(([key, value]) => (
                <input key={key} type="hidden" name={key} value={value} />
              ))}
              <button type="submit" className="btn-primary px-5">
                <Search size={16} aria-hidden />
                {command.button}
              </button>
            </div>
            <p className="hidden text-[13px] text-muted sm:block">{command.hint}</p>
          </form>
        )}
      </div>
    </header>
  );
}
