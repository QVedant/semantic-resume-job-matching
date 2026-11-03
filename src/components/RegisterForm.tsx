"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent, type ReactNode } from "react";
import { BRANCHES } from "@/lib/constants";

type Role = "STUDENT" | "RECRUITER";
type ApiResult = { redirectTo?: string; error?: string; fieldErrors?: Record<string, string> };

const EMPTY_FORM = {
  email: "",
  password: "",
  full_name: "",
  // student fields
  usn: "",
  branch: "",
  cgpa: "",
  grad_year: String(new Date().getFullYear() + 1),
  // recruiter fields
  company_name: "",
  designation: "",
};

export default function RegisterForm() {
  const router = useRouter();
  const [role, setRole] = useState<Role>("STUDENT");
  const [form, setForm] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  function update(field: keyof typeof EMPTY_FORM, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setErrors({});
    setFormError(null);

    // Send only the fields that belong to the chosen role.
    const common = { role, email: form.email, password: form.password, full_name: form.full_name };
    const payload =
      role === "STUDENT"
        ? { ...common, usn: form.usn, branch: form.branch, cgpa: form.cgpa, grad_year: form.grad_year }
        : { ...common, company_name: form.company_name, designation: form.designation };

    const response = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const result: ApiResult = await response.json();

    if (!response.ok) {
      setErrors(result.fieldErrors ?? {});
      setFormError(result.error ?? "Registration failed.");
      setBusy(false);
      return;
    }
    router.push(result.redirectTo ?? "/");
    router.refresh();
  }

  // One labelled input with its own error message underneath.
  // Called as a plain function, {Field({...})}, rather than as <Field />: a
  // component defined inside another component would be re-created on every
  // keystroke, making the input lose focus while typing.
  function Field(props: {
    name: keyof typeof EMPTY_FORM;
    label: string;
    type?: string;
    placeholder?: string;
    autoComplete?: string;
    children?: ReactNode;
  }) {
    const { name, label, type = "text", placeholder, autoComplete, children } = props;
    return (
      <div>
        <label htmlFor={name} className="label">{label}</label>
        {children ?? (
          <input
            id={name}
            type={type}
            placeholder={placeholder}
            autoComplete={autoComplete}
            value={form[name]}
            onChange={(e) => update(name, e.target.value)}
            className={`input ${errors[name] ? "input-invalid" : ""}`}
          />
        )}
        {errors[name] && <p className="field-error">{errors[name]}</p>}
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="card space-y-4" noValidate>
      {/* Role switch: decides which extra fields are shown and sent. */}
      <div className="grid grid-cols-2 gap-2 rounded-lg bg-black/5 p-1 dark:bg-white/10">
        {(["STUDENT", "RECRUITER"] as const).map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => {
              setRole(option);
              setErrors({});
              setFormError(null);
            }}
            className={`rounded-md py-2 text-sm font-medium transition ${
              role === option ? "bg-blue-600 text-white" : "hover:bg-black/5 dark:hover:bg-white/10"
            }`}
          >
            {option === "STUDENT" ? "I'm a student" : "I'm a recruiter"}
          </button>
        ))}
      </div>

      {formError && <p className="alert-error">{formError}</p>}

      {Field({ name: "full_name", label: "Full name", autoComplete: "name" })}
      {Field({ name: "email", label: "Email", type: "email", autoComplete: "email" })}
      {Field({ name: "password", label: "Password (at least 8 characters)", type: "password", autoComplete: "new-password" })}

      {role === "STUDENT" ? (
        <>
          {Field({ name: "usn", label: "USN", placeholder: "PES2UG23CS001" })}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {Field({
              name: "branch",
              label: "Branch",
              children: (
                <select
                  id="branch"
                  value={form.branch}
                  onChange={(e) => update("branch", e.target.value)}
                  className={`input ${errors.branch ? "input-invalid" : ""}`}
                >
                  <option value="">Select…</option>
                  {BRANCHES.map((branch) => (
                    <option key={branch} value={branch}>{branch}</option>
                  ))}
                </select>
              ),
            })}
            {Field({ name: "cgpa", label: "CGPA", type: "number", placeholder: "8.50" })}
            {Field({ name: "grad_year", label: "Graduation year", type: "number" })}
          </div>
        </>
      ) : (
        <>
          {Field({ name: "company_name", label: "Company name", placeholder: "e.g. Nimbus Cloud Systems" })}
          {Field({ name: "designation", label: "Designation (optional)", placeholder: "e.g. Talent Partner" })}
        </>
      )}

      <button type="submit" disabled={busy} className="btn-primary w-full">
        {busy ? "Creating account…" : "Create account"}
      </button>

      <p className="text-center text-sm opacity-80">
        Already registered?{" "}
        <Link href="/login" className="font-medium text-blue-600 hover:underline dark:text-blue-400">
          Log in
        </Link>
      </p>
    </form>
  );
}
