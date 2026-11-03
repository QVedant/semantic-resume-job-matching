"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { MAX_TEXT_WORDS, countWords } from "@/lib/constants";

// Resume text box with a live word counter. Saving sends the text to
// PUT /api/student/resume, which runs the AI model on it and refreshes the
// student's job matches.
export default function ResumeEditor({ initialText }: { initialText: string }) {
  const router = useRouter();
  const [text, setText] = useState(initialText);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const words = countWords(text);
  const tooLong = words > MAX_TEXT_WORDS;

  async function save(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    setSaved(false);
    const response = await fetch("/api/student/resume", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ resume_text: text }),
    });
    const result = await response.json();
    setBusy(false);
    if (!response.ok) {
      setError(result.fieldErrors?.resume_text ?? result.error ?? "Could not save.");
      return;
    }
    setSaved(true);
    router.refresh();
  }

  return (
    <form onSubmit={save} className="card space-y-3">
      <label htmlFor="resume" className="label">
        Your resume: skills, projects, internships and achievements, in plain sentences
      </label>
      <textarea
        id="resume"
        rows={14}
        value={text}
        onChange={(e) => {
          setText(e.target.value);
          setSaved(false);
        }}
        className={`input font-normal leading-relaxed ${tooLong || error ? "input-invalid" : ""}`}
        placeholder="e.g. Final-year CSE student who built REST APIs in Node.js with PostgreSQL..."
      />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <span className={`text-sm ${tooLong ? "font-medium text-red-600 dark:text-red-400" : "opacity-70"}`}>
          {words} / {MAX_TEXT_WORDS} words
        </span>
        <button type="submit" disabled={busy || tooLong || words === 0} className="btn-primary">
          {busy ? "Analysing with AI…" : "Save and update my matches"}
        </button>
      </div>
      {error && <p className="alert-error">{error}</p>}
      {saved && (
        <p className="text-sm font-medium text-green-700 dark:text-green-400">
          ✓ Saved. Your resume was re-analysed and your matches were updated.{" "}
          <Link href="/student/recommended" className="underline">
            See recommended jobs →
          </Link>
        </p>
      )}
    </form>
  );
}
