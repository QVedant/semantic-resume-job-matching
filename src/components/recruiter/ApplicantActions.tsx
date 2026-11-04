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
    <div className="space-y-2 border-t border-line pt-4">
      {canRecordRound && (
        <div className="flex flex-wrap items-center gap-2">
          <label htmlFor={`feedback-${applicant.application_id}`} className="text-sm whitespace-nowrap">
            Round {pendingRound.round_no}, {pendingRound.round_name}:
          </label>
          <input
            id={`feedback-${applicant.application_id}`}
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            placeholder="Feedback (optional)"
            className="input w-auto min-w-48 flex-1 py-1.5 text-sm"
            maxLength={500}
          />
          <button type="button" disabled={busy} onClick={() => recordRound("PASSED")} className="btn-primary px-3 py-1.5">
            Passed
          </button>
          <button type="button" disabled={busy} onClick={() => recordRound("REJECTED")} className="btn-danger-outline px-3 py-1.5">
            Failed
          </button>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm text-muted">Decision:</span>
        {(ACTIONS[applicant.status] ?? []).map((action) => (
          <button
            key={action.status}
            type="button"
            disabled={busy}
            onClick={() => setStatus(action.status)}
            className={action.danger ? "btn-danger-outline px-3 py-1.5" : "btn-secondary px-3 py-1.5"}
          >
            {action.label}
          </button>
        ))}
        {!ACTIONS[applicant.status] && <span className="text-sm text-muted">final ({applicant.status.toLowerCase()})</span>}
      </div>
      {error && <p className="text-sm text-danger">{error}</p>}
    </div>
  );
}
