"use client";

import { Loader2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { ApiError, auth } from "@/lib/auth";
import type { Locale } from "@/lib/i18n";

type Mode = "register" | "login";

/** Explicit, so a missing label is a compile error at the call site rather
 *  than `undefined` rendered into the page. */
export interface AuthLabels {
  name: string;
  handle: string;
  handleHint: string;
  email: string;
  password: string;
  passwordHint: string;
  createAccount: string;
  signIn: string;
  haveAccount: string;
  noAccount: string;
  networkError: string;
}

export function AuthForm({
  mode,
  locale,
  labels,
}: {
  mode: Mode;
  locale: Locale;
  labels: AuthLabels;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [fields, setFields] = useState<Record<string, string[]>>({});

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError("");
    setFields({});

    const form = new FormData(event.currentTarget);
    try {
      if (mode === "register") {
        await auth.register({
          email: String(form.get("email")),
          handle: String(form.get("handle")),
          name: String(form.get("name")),
          password: String(form.get("password")),
          locale,
        });
      } else {
        await auth.login({
          email: String(form.get("email")),
          password: String(form.get("password")),
        });
      }
      router.push(`/${locale}/settings/profile`);
      router.refresh();
    } catch (caught) {
      if (caught instanceof ApiError) {
        setError(caught.message);
        setFields(caught.fields);
      } else {
        setError(labels.networkError);
      }
    } finally {
      setPending(false);
    }
  }

  const fieldError = (name: string) => fields[name]?.[0];

  return (
    <form onSubmit={onSubmit} className="space-y-4" noValidate>
      {error && (
        <p
          role="alert"
          className="rounded-md border px-3 py-2 text-sm"
          style={{ background: "var(--clr-danger-bg)", color: "var(--clr-text)" }}
        >
          {error}
        </p>
      )}

      {mode === "register" && (
        <>
          <Field
            name="name"
            label={labels.name}
            autoComplete="name"
            required
            error={fieldError("name")}
          />
          <Field
            name="handle"
            label={labels.handle}
            hint={labels.handleHint}
            autoComplete="username"
            required
            error={fieldError("handle")}
          />
        </>
      )}

      <Field
        name="email"
        type="email"
        label={labels.email}
        autoComplete="email"
        required
        error={fieldError("email")}
      />
      <Field
        name="password"
        type="password"
        label={labels.password}
        hint={mode === "register" ? labels.passwordHint : undefined}
        autoComplete={mode === "register" ? "new-password" : "current-password"}
        required
        error={fieldError("password")}
      />

      <button type="submit" disabled={pending} className="btn btn-primary h-11 w-full">
        {pending && <Loader2 size={16} className="animate-spin" aria-hidden />}
        {mode === "register" ? labels.createAccount : labels.signIn}
      </button>

      <p className="text-center text-sm text-content-muted">
        {mode === "register" ? labels.haveAccount : labels.noAccount}{" "}
        <Link
          href={`/${locale}/${mode === "register" ? "login" : "register"}`}
          className="font-medium text-primary hover:underline"
        >
          {mode === "register" ? labels.signIn : labels.createAccount}
        </Link>
      </p>
    </form>
  );
}

function Field({
  name,
  label,
  hint,
  error,
  type = "text",
  ...rest
}: {
  name: string;
  label: string;
  hint?: string;
  error?: string;
  type?: string;
} & React.InputHTMLAttributes<HTMLInputElement>) {
  const describedBy = [hint && `${name}-hint`, error && `${name}-error`]
    .filter(Boolean)
    .join(" ");

  return (
    <div>
      {/* Every input has a real label — never a placeholder standing in (§12.3). */}
      <label htmlFor={name} className="mb-1.5 block text-sm font-medium text-content">
        {label}
      </label>
      <input
        id={name}
        name={name}
        type={type}
        aria-describedby={describedBy || undefined}
        aria-invalid={error ? true : undefined}
        className="w-full rounded-md border bg-transparent px-3 py-2.5 text-sm text-content outline-none transition focus:border-primary"
        style={error ? { borderColor: "var(--clr-danger)" } : undefined}
        {...rest}
      />
      {hint && !error && (
        <p id={`${name}-hint`} className="mt-1 text-xs text-content-muted">
          {hint}
        </p>
      )}
      {error && (
        <p id={`${name}-error`} className="mt-1 text-xs" style={{ color: "var(--clr-danger)" }}>
          {error}
        </p>
      )}
    </div>
  );
}
