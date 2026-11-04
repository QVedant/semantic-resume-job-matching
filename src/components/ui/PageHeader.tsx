import type { ReactNode } from "react";

// The big serif title at the top of each page, e.g. "Welcome, *Aarav*":
// `title` in roman, `accent` in italic grey. `description` is a short line
// underneath; wrap key numbers in <strong> so they stand out.
export default function PageHeader({
  title,
  accent,
  description,
  actions,
}: {
  title: ReactNode;
  accent?: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div className="space-y-2">
        <h1 className="font-display text-[40px] leading-[1.05] font-normal text-foreground sm:text-5xl">
          {title}
          {accent && (
            <>
              {" "}
              <em className="text-accent-ink">{accent}</em>
            </>
          )}
        </h1>
        {description && <p className="max-w-3xl text-[15px] text-muted [&_strong]:font-semibold [&_strong]:text-foreground">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </header>
  );
}
