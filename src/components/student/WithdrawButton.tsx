"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

// Two-step withdraw (click, then confirm) so it can't happen by accident.
export default function WithdrawButton({ applicationId }: { applicationId: number }) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function withdraw() {
    setBusy(true);
    setError(null);
    const response = await fetch(`/api/applications/${applicationId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "WITHDRAWN" }),
    });
    if (!response.ok) {
      const result = await response.json();
      setError(result.error ?? "Could not withdraw.");
      setBusy(false);
      setConfirming(false);
      return;
    }
    router.refresh();
  }

  if (!confirming) {
    return (
      <div className="space-y-1">
        <button type="button" onClick={() => setConfirming(true)} className="btn-secondary px-3 py-1 text-sm">
          Withdraw
        </button>
        {error && <p className="text-sm text-danger">{error}</p>}
      </div>
    );
  }
  return (
    <div className="flex items-center gap-2 text-sm">
      <span>Withdraw this application?</span>
      <button
        type="button"
        onClick={withdraw}
        disabled={busy}
        className="btn-danger px-3 py-1 text-sm"
      >
        {busy ? "Withdrawing…" : "Yes, withdraw"}
      </button>
      <button type="button" onClick={() => setConfirming(false)} className="btn-secondary px-3 py-1 text-sm">
        Cancel
      </button>
    </div>
  );
}
