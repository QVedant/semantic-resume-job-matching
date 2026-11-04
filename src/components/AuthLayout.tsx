import type { ReactNode } from "react";

// Narrow centred column for login / register: serif title, then the form card.
export default function AuthLayout({
  title,
  accent,
  subtitle,
  children,
}: {
  title: string;
  accent?: string;
  subtitle: string;
  children: ReactNode;
}) {
  return (
    <main className="mx-auto max-w-lg px-4 py-12 sm:py-16">
      <h1 className="font-display text-5xl leading-[1.05]">
        {title}
        {accent && (
          <>
            {" "}
            <em className="text-accent-ink">{accent}</em>
          </>
        )}
      </h1>
      <p className="mt-3 mb-7 text-[15px] text-muted">{subtitle}</p>
      {children}
    </main>
  );
}
