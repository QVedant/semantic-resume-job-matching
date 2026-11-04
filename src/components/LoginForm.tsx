"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

type ApiResult = { redirectTo?: string; error?: string; fieldErrors?: Record<string, string> };

export default function LoginForm({ next }: { next: string | null }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault(); // stop the browser's default full-page form submit
    setBusy(true);
    setErrors({});
    setFormError(null);

    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const result: ApiResult = await response.json();

    if (!response.ok) {
      setErrors(result.fieldErrors ?? {});
      setFormError(result.error ?? "Login failed.");
      setBusy(false);
      return;
    }
    // Go back to the page the user originally wanted, if any, else their dashboard.
    router.push(next ?? result.redirectTo ?? "/");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="card space-y-4" noValidate>
      {formError && <p className="alert-error">{formError}</p>}

      <div>
        <label htmlFor="email" className="label">Email</label>
        <input
          id="email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className={`input ${errors.email ? "input-invalid" : ""}`}
        />
        {errors.email && <p className="field-error">{errors.email}</p>}
      </div>

      <div>
        <label htmlFor="password" className="label">Password</label>
        <input
          id="password"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className={`input ${errors.password ? "input-invalid" : ""}`}
        />
        {errors.password && <p className="field-error">{errors.password}</p>}
      </div>

      <button type="submit" disabled={busy} className="btn-primary w-full">
        {busy ? "Logging in…" : "Log in"}
      </button>

      <p className="text-center text-sm text-muted">
        New here?{" "}
        <Link href="/register" className="link">
          Create an account
        </Link>
      </p>
    </form>
  );
}
