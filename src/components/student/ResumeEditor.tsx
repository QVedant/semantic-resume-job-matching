"use client";

import { FileText, Upload } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState, type ChangeEvent, type FormEvent } from "react";
import { MAX_PDF_BYTES, MAX_TEXT_WORDS, countWords } from "@/lib/constants";

type FileInfo = { file_name: string; size_bytes: number; uploaded_at: string };

// Keeps the first `limit` words of a text, preserving its line breaks.
function firstWords(text: string, limit: number): string {
  let count = 0;
  for (const match of text.matchAll(/\S+/g)) {
    count += 1;
    if (count === limit) return text.slice(0, (match.index ?? 0) + match[0].length);
  }
  return text;
}

const kb = (bytes: number) => `${Math.max(1, Math.round(bytes / 1024))} KB`;

// The resume page's working area:
//   1. Upload a PDF -> it is stored in the database, and its text fills the box
//   2. Review/trim the text (max 300 words)
//   3. Save -> PUT /api/student/resume runs the AI model and refreshes matches
export default function ResumeEditor({
  initialText,
  initialFile,
  pdfUrl,
}: {
  initialText: string;
  initialFile: FileInfo | null;
  pdfUrl: string;
}) {
  const router = useRouter();
  const fileInput = useRef<HTMLInputElement>(null);
  const [text, setText] = useState(initialText);
  const [file, setFile] = useState<FileInfo | null>(initialFile);
  const [busy, setBusy] = useState<"save" | "upload" | "remove" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const words = countWords(text);
  const tooLong = words > MAX_TEXT_WORDS;

  async function upload(event: ChangeEvent<HTMLInputElement>) {
    const chosen = event.target.files?.[0];
    event.target.value = ""; // allow choosing the same file again later
    if (!chosen) return;
    setError(null);
    setNotice(null);
    setSaved(false);
    if (chosen.size > MAX_PDF_BYTES) {
      setError("The PDF must be 2 MB or smaller.");
      return;
    }

    setBusy("upload");
    const body = new FormData();
    body.append("file", chosen);
    const response = await fetch("/api/student/resume/pdf", { method: "POST", body });
    const result = await response.json();
    setBusy(null);
    if (!response.ok) {
      setError(result.error ?? "Upload failed.");
      return;
    }

    setFile(result.file);
    if (result.text) {
      setText(result.text);
      setNotice(
        result.word_count > MAX_TEXT_WORDS
          ? `Text taken from your PDF: ${result.word_count} words. Trim it to ${MAX_TEXT_WORDS}, then save.`
          : `Text taken from your PDF: ${result.word_count} words. Check it, then save.`,
      );
    } else {
      setNotice(result.notice);
    }
    router.refresh();
  }

  async function removePdf() {
    setBusy("remove");
    setError(null);
    const response = await fetch("/api/student/resume/pdf", { method: "DELETE" });
    setBusy(null);
    if (!response.ok) {
      setError((await response.json()).error ?? "Could not remove the PDF.");
      return;
    }
    setFile(null);
    setNotice("PDF removed. Your resume text is unchanged.");
    router.refresh();
  }

  async function save(event: FormEvent) {
    event.preventDefault();
    setBusy("save");
    setError(null);
    setSaved(false);
    const response = await fetch("/api/student/resume", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ resume_text: text }),
    });
    const result = await response.json();
    setBusy(null);
    if (!response.ok) {
      setError(result.fieldErrors?.resume_text ?? result.error ?? "Could not save.");
      return;
    }
    setNotice(null);
    setSaved(true);
    router.refresh();
  }

  return (
    <div className="space-y-5">
      <section className="card space-y-3">
        <h2 className="section-label">Resume PDF</h2>
        {file ? (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <FileText size={20} className="text-primary" aria-hidden />
              <div className="space-y-1">
                <p className="text-[15px] font-medium">{file.file_name}</p>
                <div className="flex flex-wrap gap-1.5">
                  <span className="chip chip-gray">{kb(file.size_bytes)}</span>
                  <span className="chip chip-gray">
                    uploaded {new Date(file.uploaded_at).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                  </span>
                </div>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <a href={pdfUrl} target="_blank" rel="noreferrer" className="btn-secondary px-3 py-1.5">
                View
              </a>
              <button type="button" onClick={() => fileInput.current?.click()} disabled={busy !== null} className="btn-secondary px-3 py-1.5">
                {busy === "upload" ? "Uploading…" : "Replace"}
              </button>
              <button type="button" onClick={removePdf} disabled={busy !== null} className="btn-danger-outline px-3 py-1.5">
                {busy === "remove" ? "Removing…" : "Remove"}
              </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-muted">
              Upload your resume as a PDF (up to 2 MB). Recruiters you apply to can open it, and its text is
              filled in below for you to check.
            </p>
            <button type="button" onClick={() => fileInput.current?.click()} disabled={busy !== null} className="btn-primary">
              <Upload size={16} aria-hidden />
              {busy === "upload" ? "Uploading…" : "Upload PDF"}
            </button>
          </div>
        )}
        <input ref={fileInput} type="file" accept="application/pdf,.pdf" onChange={upload} className="sr-only" aria-label="Resume PDF" />
      </section>

      <form onSubmit={save} className="card space-y-3">
        <label htmlFor="resume" className="section-label block">
          Resume text, used for matching
        </label>
        {notice && <p className="alert-warning">{notice}</p>}
        <textarea
          id="resume"
          rows={13}
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            setSaved(false);
          }}
          className={`input leading-relaxed ${tooLong || error ? "input-invalid" : ""}`}
          placeholder="e.g. Final-year CSE student who built REST APIs in Node.js with PostgreSQL…"
        />
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className={`chip ${tooLong ? "chip-red" : "chip-gray"}`}>
              {words}/{MAX_TEXT_WORDS} words
            </span>
            {tooLong && (
              <button type="button" onClick={() => setText(firstWords(text, MAX_TEXT_WORDS))} className="btn-secondary px-3 py-1">
                Keep the first {MAX_TEXT_WORDS} words
              </button>
            )}
          </div>
          <button type="submit" disabled={busy !== null || tooLong || words === 0} className="btn-primary">
            {busy === "save" ? "Analysing…" : "Save and update matches"}
          </button>
        </div>
        {error && <p className="alert-error">{error}</p>}
        {saved && (
          <p className="alert-success">
            Saved. Your resume was analysed again and your matches are updated.{" "}
            <Link href="/student/recommended" className="link">
              See your matches
            </Link>
          </p>
        )}
      </form>
    </div>
  );
}
