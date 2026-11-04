"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { BRANCHES, MAX_TEXT_WORDS, ROUND_TYPES, SKILL_IMPORTANCE, countWords, todayIso } from "@/lib/constants";

type Skill = { skill_id: number; name: string; category: string | null };
type SkillRow = { skill_id: string; weight: string };
type RoundRow = { round_name: string; round_type: string };

const ROUND_TYPE_LABEL: Record<string, string> = {
  ONLINE_TEST: "Online test",
  GD: "Group discussion",
  TECHNICAL_INTERVIEW: "Technical interview",
  HR_INTERVIEW: "HR interview",
  OFFER: "Offer discussion",
};

// The "Post a job" form. Sends everything to POST /api/recruiter/jobs, which
// saves the job, skills, rounds and AI embedding in one transaction.
export default function JobForm({ skills }: { skills: Skill[] }) {
  const router = useRouter();
  const [form, setForm] = useState({
    title: "",
    description: "",
    location: "Bengaluru",
    ctc_lpa: "",
    min_cgpa: "7.0",
    deadline: "",
    status: "OPEN",
  });
  const [branches, setBranches] = useState<string[]>(["CSE", "ISE", "AIML"]);
  const [skillRows, setSkillRows] = useState<SkillRow[]>([{ skill_id: "", weight: "0.9" }]);
  const [rounds, setRounds] = useState<RoundRow[]>([
    { round_name: "Online Test", round_type: "ONLINE_TEST" },
    { round_name: "Technical Interview", round_type: "TECHNICAL_INTERVIEW" },
    { round_name: "HR Interview", round_type: "HR_INTERVIEW" },
  ]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const words = countWords(form.description);
  const update = (field: keyof typeof form, value: string) => setForm((f) => ({ ...f, [field]: value }));

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setErrors({});
    setFormError(null);

    const response = await fetch("/api/recruiter/jobs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        eligible_branches: branches,
        skills: skillRows.filter((row) => row.skill_id).map((row) => ({ skill_id: row.skill_id, weight: row.weight })),
        rounds,
      }),
    });
    const result = await response.json();
    if (!response.ok) {
      setErrors(result.fieldErrors ?? {});
      setFormError(result.error ?? "Could not post the job.");
      setBusy(false);
      return;
    }
    router.push(result.redirectTo);
    router.refresh();
  }

  const error = (field: string) => errors[field] && <p className="field-error">{errors[field]}</p>;
  const invalid = (field: string) => (errors[field] ? "input-invalid" : "");

  return (
    <form onSubmit={submit} className="space-y-5" noValidate>
      {formError && <p className="alert-error">{formError}</p>}

      <section className="card space-y-4">
        <h2 className="section-label">Job details</h2>
        <div>
          <label htmlFor="title" className="label">Job title</label>
          <input id="title" value={form.title} onChange={(e) => update("title", e.target.value)} className={`input ${invalid("title")}`} placeholder="e.g. Backend Engineer (Node.js)" />
          {error("title")}
        </div>
        <div>
          <label htmlFor="description" className="label">
            Description (students are matched on its meaning)
          </label>
          <textarea id="description" rows={7} value={form.description} onChange={(e) => update("description", e.target.value)} className={`input ${invalid("description")}`} />
          <p className={`mt-1 text-sm ${words > MAX_TEXT_WORDS ? "text-danger" : "text-muted"}`}>
            {words} / {MAX_TEXT_WORDS} words
          </p>
          {error("description")}
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <label htmlFor="location" className="label">Location</label>
            <input id="location" value={form.location} onChange={(e) => update("location", e.target.value)} className={`input ${invalid("location")}`} />
            {error("location")}
          </div>
          <div>
            <label htmlFor="ctc_lpa" className="label">CTC (LPA)</label>
            <input id="ctc_lpa" type="number" min={0} step={0.5} value={form.ctc_lpa} onChange={(e) => update("ctc_lpa", e.target.value)} className={`input ${invalid("ctc_lpa")}`} placeholder="12" />
            {error("ctc_lpa")}
          </div>
          <div>
            <label htmlFor="deadline" className="label">Application deadline</label>
            <input id="deadline" type="date" min={todayIso()} value={form.deadline} onChange={(e) => update("deadline", e.target.value)} className={`input ${invalid("deadline")}`} />
            {error("deadline")}
          </div>
        </div>
      </section>

      <section className="card space-y-4">
        <h2 className="section-label">Eligibility</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <label htmlFor="min_cgpa" className="label">Minimum CGPA</label>
            <input id="min_cgpa" type="number" min={0} max={10} step={0.1} value={form.min_cgpa} onChange={(e) => update("min_cgpa", e.target.value)} className={`input ${invalid("min_cgpa")}`} />
            {error("min_cgpa")}
          </div>
          <div className="sm:col-span-2">
            <p className="label">Eligible branches</p>
            <div className="flex flex-wrap gap-3 pt-1">
              {BRANCHES.map((branch) => (
                <label key={branch} className="flex items-center gap-1.5 text-sm">
                  <input
                    type="checkbox"
                    checked={branches.includes(branch)}
                    onChange={(e) =>
                      setBranches((current) => (e.target.checked ? [...current, branch] : current.filter((b) => b !== branch)))
                    }
                  />
                  {branch}
                </label>
              ))}
            </div>
            {error("eligible_branches")}
          </div>
        </div>
      </section>

      <section className="card space-y-3">
        <h2 className="section-label">Required skills</h2>
        {skillRows.map((row, index) => (
          <div key={index} className="flex flex-wrap gap-2">
            <select
              aria-label="Skill"
              value={row.skill_id}
              onChange={(e) => setSkillRows((rows) => rows.map((r, i) => (i === index ? { ...r, skill_id: e.target.value } : r)))}
              className="input w-auto flex-1"
            >
              <option value="">Choose a skill…</option>
              {skills.map((skill) => (
                <option key={skill.skill_id} value={skill.skill_id}>
                  {skill.name}{skill.category ? ` (${skill.category})` : ""}
                </option>
              ))}
            </select>
            <select
              aria-label="Importance"
              value={row.weight}
              onChange={(e) => setSkillRows((rows) => rows.map((r, i) => (i === index ? { ...r, weight: e.target.value } : r)))}
              className="input w-auto"
            >
              {SKILL_IMPORTANCE.map((level) => (
                <option key={level.weight} value={level.weight}>{level.label}</option>
              ))}
            </select>
            <button type="button" onClick={() => setSkillRows((rows) => rows.filter((_, i) => i !== index))} className="btn-secondary px-3" aria-label="Remove skill">
              ✕
            </button>
          </div>
        ))}
        <button type="button" onClick={() => setSkillRows((rows) => [...rows, { skill_id: "", weight: "0.6" }])} className="btn-secondary text-sm">
          + Add skill
        </button>
        {error("skills")}
      </section>

      <section className="card space-y-3">
        <h2 className="section-label">Selection rounds, in order</h2>
        {rounds.map((round, index) => (
          <div key={index} className="flex flex-wrap items-center gap-2">
            <span className="w-6 text-sm text-muted">{index + 1}.</span>
            <input
              aria-label="Round name"
              value={round.round_name}
              onChange={(e) => setRounds((rs) => rs.map((r, i) => (i === index ? { ...r, round_name: e.target.value } : r)))}
              className="input flex-1"
            />
            <select
              aria-label="Round type"
              value={round.round_type}
              onChange={(e) => setRounds((rs) => rs.map((r, i) => (i === index ? { ...r, round_type: e.target.value } : r)))}
              className="input w-auto"
            >
              {ROUND_TYPES.map((type) => (
                <option key={type} value={type}>{ROUND_TYPE_LABEL[type]}</option>
              ))}
            </select>
            <button type="button" onClick={() => setRounds((rs) => rs.filter((_, i) => i !== index))} className="btn-secondary px-3" aria-label="Remove round">
              ✕
            </button>
          </div>
        ))}
        <button type="button" onClick={() => setRounds((rs) => [...rs, { round_name: "", round_type: "TECHNICAL_INTERVIEW" }])} className="btn-secondary text-sm">
          + Add round
        </button>
        {error("rounds")}
      </section>

      <section className="card flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap gap-4 text-sm">
          <label className="flex items-center gap-2">
            <input type="radio" name="status" checked={form.status === "OPEN"} onChange={() => update("status", "OPEN")} />
            Publish now (students can apply)
          </label>
          <label className="flex items-center gap-2">
            <input type="radio" name="status" checked={form.status === "DRAFT"} onChange={() => update("status", "DRAFT")} />
            Save as draft
          </label>
        </div>
        <button type="submit" disabled={busy} className="btn-primary">
          {busy ? "Saving and analysing with AI…" : form.status === "OPEN" ? "Post job" : "Save draft"}
        </button>
      </section>
    </form>
  );
}
