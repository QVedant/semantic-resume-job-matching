import type { ReactNode } from "react";

// Shown instead of an empty list: what's missing and what to do next.
export default function EmptyState({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="card space-y-1 py-8 text-center">
      <p className="font-medium">{title}</p>
      {children && <div className="text-sm text-muted">{children}</div>}
    </div>
  );
}
