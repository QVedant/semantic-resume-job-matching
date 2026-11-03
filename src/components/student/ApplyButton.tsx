"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

// Sends the application. The database trigger decides eligibility, and if it
// refuses, its reason is shown right under the button.
export default function ApplyButton({ jobId, disabledReason }: { jobId: number; disabledReason?: string }) {
  const router = useRouter();
  const [state, setState] = useState<"idle" | "busy" | "done">("idle");
  const [message, setMessage] = useState<string | null>(null);
  const [isError, setIsError] = useState(false);

  async function apply() {
    setState("busy");
    setMessage(null);
    const response = await fetch("/api/applications", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ job_id: jobId }),
    });
    const result = await response.json();

    if (!response.ok) {
      setState("idle");
      setIsError(true);
      setMessage(result.error ?? "Could not apply.");
      return;
    }
    setState("done");
    setIsError(false);
    const score = result.matchScore === null ? "" : ` · match ${Math.round(result.matchScore * 100)}%`;
    setMessage(`Applied${score}${result.firstRound ? ` · next: ${result.firstRound}` : ""}`);
    router.refresh(); // reload server data so badges and counts update
  }

  if (state === "done") {
    return <p className="text-sm font-medium text-green-700 dark:text-green-400">✓ {message}</p>;
  }

  return (
    <div className="space-y-1">
      <button
        type="button"
        onClick={apply}
        disabled={state === "busy"}
        title={disabledReason}
        className="btn-primary px-3 py-1.5 text-sm"
      >
        {state === "busy" ? "Applying…" : "Apply"}
      </button>
      {message && (
        <p className={`text-sm ${isError ? "text-red-600 dark:text-red-400" : ""}`}>{message}</p>
      )}
    </div>
  );
}
