"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

// "Publish" for drafts, "Close applications" for open jobs (two-step confirm).
export default function JobStatusButton({ jobId, status }: { jobId: number; status: string }) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (status === "CLOSED") return null;
  const target = status === "DRAFT" ? "OPEN" : "CLOSED";

  async function change() {
    setBusy(true);
    setError(null);
    const response = await fetch(`/api/recruiter/jobs/${jobId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: target }),
    });
    setBusy(false);
    setConfirming(false);
    if (!response.ok) {
      setError((await response.json()).error ?? "Could not update the job.");
      return;
    }
    router.refresh();
  }

  if (target === "CLOSED" && confirming) {
    return (
      <span className="flex items-center gap-2 text-sm">
        Close applications?
        <button type="button" onClick={change} disabled={busy} className="rounded-lg bg-red-600 px-3 py-1 font-medium text-white hover:bg-red-700 disabled:opacity-50">
          {busy ? "Closing…" : "Yes, close"}
        </button>
        <button type="button" onClick={() => setConfirming(false)} className="btn-secondary px-3 py-1 text-sm">Cancel</button>
      </span>
    );
  }

  return (
    <span className="space-y-1">
      <button
        type="button"
        onClick={target === "OPEN" ? change : () => setConfirming(true)}
        disabled={busy}
        className={target === "OPEN" ? "btn-primary px-3 py-1 text-sm" : "btn-secondary px-3 py-1 text-sm"}
      >
        {busy ? "Saving…" : target === "OPEN" ? "Publish" : "Close applications"}
      </button>
      {error && <span className="block text-sm text-red-600 dark:text-red-400">{error}</span>}
    </span>
  );
}
