"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { Applicant } from "@/lib/recruiter";
import { currentRound } from "@/lib/rounds";

// Which decision buttons make sense for each status (mirrors STATUS_TRANSITIONS
// in lib/recruiter.ts; the server re-checks every change).
const ACTIONS: Record<string, { status: string; label: string; danger?: boolean }[]> = {
  APPLIED: [
    { status: "SHORTLISTED", label: "Shortlist" },
    { status: "REJECTED", label: "Reject", danger: true },
  ],
  SHORTLISTED: [
    { status: "OFFERED", label: "Make offer" },
    { status: "REJECTED", label: "Reject", danger: true },
  ],
  OFFERED: [
    { status: "HIRED", label: "Mark hired" },
    { status: "REJECTED", label: "Reject", danger: true },
  ],
};

// Decision buttons + "record result of the current interview round".
export default function ApplicantActions({ applicant }: { applicant: Applicant }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState("");

  // The round waiting for a result: the first one not yet PASSED. It may have
  // no row yet (e.g. sample applications), so we don't rely on a PENDING row.
  const pendingRound = currentRound(applicant.rounds);
  const canRecordRound = pendingRound && (applicant.status === "APPLIED" || applicant.status === "SHORTLISTED");

  async function send(url: string, method: "PATCH" | "POST", body: object) {
    setBusy(true);
    setError(null);
    const response = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    setBusy(false);
    if (!response.ok) {
      setError((await response.json()).error ?? "Something went wrong.");
      return;
    }
    setFeedback("");
    router.refresh();
  }

  const setStatus = (status: string) =>
    send(`/api/recruiter/applications/${applicant.application_id}`, "PATCH", { status });
  const recordRound = (result: "PASSED" | "REJECTED") =>
    send(`/api/recruiter/applications/${applicant.application_id}/rounds`, "POST", {
      round_id: pendingRound!.round_id,
      result,
      feedback,
    });

  return (
    <div className="space-y-3">
      {canRecordRound && (
        <div className="space-y-2 rounded-lg border border-black/10 p-3 dark:border-white/15">
          <p className="text-sm font-medium">
            Round {pendingRound.round_no}: {pendingRound.round_name}
          </p>
          <input
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            placeholder="Feedback (optional)"
            className="input text-sm"
            maxLength={500}
          />
          <div className="flex gap-2">
            <button type="button" disabled={busy} onClick={() => recordRound("PASSED")} className="btn-primary px-3 py-1 text-sm">
              Passed
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => recordRound("REJECTED")}
              className="rounded-lg bg-red-600 px-3 py-1 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
            >
              Failed
            </button>
          </div>
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {(ACTIONS[applicant.status] ?? []).map((action) => (
          <button
            key={action.status}
            type="button"
            disabled={busy}
            onClick={() => setStatus(action.status)}
            className={
              action.danger
                ? "rounded-lg border border-red-500/50 px-3 py-1 text-sm font-medium text-red-700 hover:bg-red-500/10 disabled:opacity-50 dark:text-red-300"
                : "btn-secondary px-3 py-1 text-sm"
            }
          >
            {action.label}
          </button>
        ))}
      </div>
      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
    </div>
  );
}
