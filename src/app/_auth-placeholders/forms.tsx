// TEMPORARY forms for login, registration, pairing and logout, so Alex can try the
// API in a browser. Roberta replaces them with designed pages in Session F
// (folders starting with "_" are not pages in Next.js; this one only holds parts).
//
// "use client": these run in the browser (they react to typing and clicks). They
// send JSON to our API and show its Bulgarian error message. The login cookies are
// set by the server on the API response; this code never sees them.

"use client";

import { useState, type FormEvent } from "react";
import { homePathForRole, ROUTES, type AppRole } from "@/config/routes";
import { bg } from "@/i18n/bg";

// What our API answers: either data or { error: { code, messageBg } }.
type ApiAnswer = {
  role?: AppRole;
  needsEmailConfirmation?: boolean;
  error?: { code: string; messageBg: string };
};

// Sends `body` as JSON with POST and reads the JSON answer.
async function postJson(url: string, body: unknown): Promise<{ ok: boolean; data: ApiAnswer }> {
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = (await response.json()) as ApiAnswer;
    return { ok: response.ok, data };
  } catch {
    return { ok: false, data: { error: { code: "network", messageBg: bg.errors.internal } } };
  }
}

// Reads the text fields of a submitted form into an object, e.g. { email: "…" }
// (like filling a Python dict in a loop).
function formValues(event: FormEvent<HTMLFormElement>): Record<string, string> {
  const values: Record<string, string> = {};
  for (const [name, value] of new FormData(event.currentTarget).entries()) {
    values[name] = String(value);
  }
  return values;
}

const inputClass = "rounded border px-3 py-2 text-lg";
const buttonClass = "rounded border px-4 py-2 text-lg font-bold";

// One labelled input. Plain on purpose: the design system comes in Session B/F.
function Field(props: { name: string; label: string; type: string; hint?: string }) {
  return (
    <label className="flex flex-col gap-1 text-lg">
      {props.label}
      <input name={props.name} type={props.type} required className={inputClass} />
      {props.hint ? <span className="text-base">{props.hint}</span> : null}
    </label>
  );
}

// The error or info line under a form. role="alert" makes screen readers read it.
function Message({ text }: { text: string | null }) {
  if (text === null) return null;
  return (
    <p role="alert" className="text-lg font-bold">
      {text}
    </p>
  );
}

export function LoginForm() {
  const [message, setMessage] = useState<string | null>(null);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const { ok, data } = await postJson("/api/auth/login", formValues(event));
    if (ok && data.role) {
      window.location.assign(homePathForRole(data.role));
    } else {
      setMessage(data.error?.messageBg ?? bg.errors.internal);
    }
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      <Field name="email" label={bg.auth.emailLabel} type="email" />
      <Field name="password" label={bg.auth.passwordLabel} type="password" />
      <button type="submit" className={buttonClass}>
        {bg.auth.loginButton}
      </button>
      <Message text={message} />
    </form>
  );
}

export function RegisterForm() {
  const [message, setMessage] = useState<string | null>(null);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const { ok, data } = await postJson("/api/auth/register", formValues(event));
    if (ok && data.needsEmailConfirmation) {
      setMessage(bg.auth.checkEmail);
    } else if (ok) {
      window.location.assign(ROUTES.family);
    } else {
      setMessage(data.error?.messageBg ?? bg.errors.internal);
    }
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      <Field name="displayName" label={bg.auth.displayNameLabel} type="text" />
      <Field name="email" label={bg.auth.emailLabel} type="email" />
      <Field
        name="password"
        label={bg.auth.passwordLabel}
        type="password"
        hint={bg.auth.passwordHint}
      />
      <button type="submit" className={buttonClass}>
        {bg.auth.registerButton}
      </button>
      <Message text={message} />
    </form>
  );
}

export function PairForm() {
  const [message, setMessage] = useState<string | null>(null);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const { ok, data } = await postJson("/api/pairing/redeem", formValues(event));
    if (ok) {
      window.location.assign(ROUTES.protected);
    } else {
      setMessage(data.error?.messageBg ?? bg.errors.internal);
    }
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      <label className="flex flex-col gap-1 text-lg">
        {bg.pairing.codeLabel}
        <input
          name="code"
          inputMode="numeric"
          autoComplete="one-time-code"
          pattern="[0-9]{6}"
          maxLength={6}
          required
          className={`${inputClass} text-3xl tracking-widest`}
        />
      </label>
      <button type="submit" className={buttonClass}>
        {bg.pairing.button}
      </button>
      <Message text={message} />
    </form>
  );
}

export function LogoutButton() {
  async function onClick() {
    await postJson("/api/auth/logout", {});
    window.location.assign(ROUTES.login);
  }

  return (
    <button type="button" onClick={onClick} className={buttonClass}>
      {bg.auth.logoutButton}
    </button>
  );
}
