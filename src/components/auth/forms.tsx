// Accessible sign-in, registration and pairing forms (and the header's „Изход“) on the
// Signal design: labelled fields, a large submit button, errors in a Notice that gets
// focus. They call the existing JSON API; session cookies stay on the server.
"use client";

import {
  useEffect,
  useId,
  useRef,
  useState,
  useSyncExternalStore,
  type FormEvent,
  type InputHTMLAttributes,
  type ReactNode,
} from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { homePathForRole, ROUTES, safeNextPath, withNext, type AppRole } from "@/config/routes";
import { AUTH_LINK } from "@/components/auth/AuthPage";
import { Button } from "@/components/ui/Button";
import { cn } from "@/components/ui/cn";
import { Field, Input } from "@/components/ui/Field";
import { Notice } from "@/components/ui/Notice";
import { bg } from "@/i18n/bg";
import { unsubscribeFromPushBeforeLogout } from "@/lib/push";
import { LoginSchema, RegisterSchema } from "@/schemas/auth";
import { RedeemCodeSchema } from "@/schemas/pairing";

type Message = { text: string; kind: "error" | "success" } | null;
type ApiData = Record<string, unknown>;

function isObject(value: unknown): value is ApiData {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

// A custom hook shares request state, like a small reusable Python helper object.
function useFormRequest() {
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<Message>(null);
  const [invalidField, setInvalidField] = useState<string | null>(null);
  const feedbackId = useId();
  // A ref updates immediately, blocking two submits before React renders again.
  const inFlight = useRef(false);

  function showError(text: string, field?: unknown) {
    setInvalidField(typeof field === "string" ? field : null);
    setMessage({ text, kind: "error" });
  }

  async function post(url: string, body: unknown): Promise<ApiData | null> {
    if (inFlight.current) return null;
    inFlight.current = true;
    setPending(true);
    setMessage(null);
    setInvalidField(null);
    try {
      const response = await fetch(url, {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data: unknown = await response.json();
      if (!response.ok || !isObject(data)) {
        const error = isObject(data) && isObject(data.error) ? data.error : null;
        showError(typeof error?.messageBg === "string" ? error.messageBg : bg.errors.internal);
        return null;
      }
      return data;
    } catch {
      showError(bg.auth.networkError);
      return null;
    } finally {
      inFlight.current = false;
      setPending(false);
    }
  }

  return {
    pending,
    message,
    post,
    showError,
    setMessage,
    feedbackId,
    validation: { field: invalidField, messageId: feedbackId },
  };
}

function formValues(form: HTMLFormElement): Record<string, FormDataEntryValue> {
  // Object.fromEntries builds a dictionary from key/value pairs, like Python dict().
  return Object.fromEntries(new FormData(form));
}

// One labelled input of these forms. `large` is for the older person's pairing
// screen: a big mono input for the code and a hint in large text.
function AuthField({
  label,
  hint,
  id,
  validation,
  large = false,
  ...props
}: Omit<InputHTMLAttributes<HTMLInputElement>, "size"> & {
  label: string;
  hint?: string;
  id: string;
  validation: { field: string | null; messageId: string };
  large?: boolean;
}) {
  const invalid = validation.field === props.name;
  const description =
    [hint ? `${id}-hint` : null, invalid ? validation.messageId : null].filter(Boolean).join(" ") ||
    undefined;
  return (
    <Field
      label={<span className={large ? "text-xl" : undefined}>{label}</span>}
      htmlFor={id}
      hint={large ? undefined : hint}
      hintId={`${id}-hint`}
    >
      <Input
        id={id}
        aria-describedby={description}
        aria-invalid={invalid || undefined}
        size={large ? "lg" : "md"}
        mono={large}
        className={large ? "max-w-[16rem] text-h3 tracking-[0.35em]" : undefined}
        {...props}
      />
      {large && hint ? (
        <p id={`${id}-hint`} className="text-xl text-fg-muted">
          {hint}
        </p>
      ) : null}
    </Field>
  );
}

function Feedback({
  message,
  id,
  className,
}: {
  message: Message;
  id: string;
  className?: string;
}) {
  const summary = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (message?.kind === "error") summary.current?.focus();
  }, [message]);
  if (!message) return null;
  return (
    <div
      id={id}
      ref={summary}
      tabIndex={-1}
      className={cn("appear", className)}
      role={message.kind === "error" ? "alert" : "status"}
    >
      <Notice status={message.kind === "error" ? "danger" : "safe"}>
        <p>{message.text}</p>
      </Notice>
    </div>
  );
}

// The safe `next` path of this page's address (e.g. /vhod?next=/pokana?t=…), or null.
// Read when it is needed (after a submit), so the page needs no <Suspense> for it.
function readNext(): string | null {
  return safeNextPath(new URLSearchParams(window.location.search).get("next"));
}

// Opens `path` after login or registration. With a `next` page we use replace(), so
// „Назад“ doesn't lead back to the login form (and its address with the invite).
function openAfterLogin(next: string | null, fallback: string) {
  if (next !== null) window.location.replace(next);
  else window.location.assign(fallback);
}

// The query string of the address, read only in the browser (on the server: "").
// useSyncExternalStore reads a value from outside React, like a getter.
function useQueryString(): string {
  return useSyncExternalStore(
    () => () => {},
    () => window.location.search,
    () => "",
  );
}

// A link between /vhod and /registratsia that keeps a safe `next` parameter, so a
// person who switches from login to registration still comes back to the invite.
export function KeepNextLink({ href, children }: { href: string; children: ReactNode }) {
  const next = safeNextPath(new URLSearchParams(useQueryString()).get("next"));
  return (
    <Link href={withNext(href, next)} prefetch={false} className={AUTH_LINK}>
      {children}
    </Link>
  );
}

function isRole(value: unknown): value is AppRole {
  return value === "family" || value === "moderator" || value === "admin" || value === "protected";
}

export function LoginForm() {
  const request = useFormRequest();
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (request.pending) return;
    const input = LoginSchema.safeParse(formValues(event.currentTarget));
    if (!input.success)
      return request.showError(
        input.error.issues[0]?.message ?? bg.errors.validation,
        input.error.issues[0]?.path[0],
      );
    const data = await request.post("/api/auth/login", input.data);
    if (!data) return;
    if (isRole(data.role)) openAfterLogin(readNext(), homePathForRole(data.role));
    else request.showError(bg.errors.internal);
  }
  return (
    <form noValidate onSubmit={submit} aria-busy={request.pending} className="flex flex-col gap-6">
      <fieldset
        className="flex min-w-0 flex-col gap-6 border-0 p-0"
        disabled={request.pending}
        aria-describedby={request.message ? request.feedbackId : undefined}
      >
        <AuthField
          validation={request.validation}
          id="login-email"
          name="email"
          label={bg.auth.emailLabel}
          type="email"
          autoComplete="email"
          inputMode="email"
          maxLength={254}
          required
        />
        <AuthField
          validation={request.validation}
          id="login-password"
          name="password"
          label={bg.auth.passwordLabel}
          type="password"
          autoComplete="current-password"
          maxLength={200}
          required
        />
        <Button type="submit" size="xl" className="w-full sm:w-auto" disabled={request.pending}>
          {request.pending ? bg.auth.submitting : bg.auth.loginButton}
        </Button>
      </fieldset>
      <Feedback message={request.message} id={request.feedbackId} />
    </form>
  );
}

export function RegisterForm() {
  const request = useFormRequest();
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (request.pending) return;
    const input = RegisterSchema.safeParse(formValues(event.currentTarget));
    if (!input.success)
      return request.showError(
        input.error.issues[0]?.message ?? bg.errors.validation,
        input.error.issues[0]?.path[0],
      );
    const data = await request.post("/api/auth/register", input.data);
    if (!data) return;
    const next = readNext();
    if (data.needsEmailConfirmation === true)
      request.setMessage({
        // With an invite waiting: after the e-mail, open the invite link again.
        text: next?.startsWith(ROUTES.invite) ? bg.auth.checkEmailThenInvite : bg.auth.checkEmail,
        kind: "success",
      });
    else if (data.needsEmailConfirmation === false && data.role === "family")
      openAfterLogin(next, ROUTES.family);
    else request.showError(bg.errors.internal);
  }
  return (
    <form noValidate onSubmit={submit} aria-busy={request.pending} className="flex flex-col gap-6">
      <fieldset
        className="flex min-w-0 flex-col gap-6 border-0 p-0"
        disabled={request.pending}
        aria-describedby={request.message ? request.feedbackId : undefined}
      >
        <AuthField
          validation={request.validation}
          id="register-name"
          name="displayName"
          label={bg.auth.displayNameLabel}
          type="text"
          autoComplete="name"
          maxLength={60}
          required
        />
        <AuthField
          validation={request.validation}
          id="register-email"
          name="email"
          label={bg.auth.emailLabel}
          type="email"
          autoComplete="email"
          inputMode="email"
          maxLength={254}
          required
        />
        <AuthField
          validation={request.validation}
          id="register-password"
          name="password"
          label={bg.auth.passwordLabel}
          type="password"
          autoComplete="new-password"
          minLength={10}
          maxLength={72}
          hint={bg.auth.passwordHint}
          required
        />
        <Button type="submit" size="xl" className="w-full sm:w-auto" disabled={request.pending}>
          {request.pending ? bg.auth.submitting : bg.auth.registerButton}
        </Button>
      </fieldset>
      <Feedback message={request.message} id={request.feedbackId} />
    </form>
  );
}

export function PairForm() {
  const request = useFormRequest();
  const params = useSearchParams();
  const queryCode = params.get("kod") ?? "";
  const initialCode = /^\d{6}$/.test(queryCode) ? queryCode : "";
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (request.pending) return;
    const input = RedeemCodeSchema.safeParse(formValues(event.currentTarget));
    if (!input.success)
      return request.showError(
        input.error.issues[0]?.message ?? bg.errors.validation,
        input.error.issues[0]?.path[0],
      );
    const data = await request.post("/api/pairing/redeem", input.data);
    if (!data) return;
    if (data.role === "protected") window.location.assign(ROUTES.protected);
    else request.showError(bg.errors.internal);
  }
  return (
    <form
      noValidate
      onSubmit={submit}
      aria-busy={request.pending}
      className="pairing-form flex flex-col gap-8"
    >
      <fieldset
        className="flex min-w-0 flex-col gap-6 border-0 p-0"
        disabled={request.pending}
        aria-describedby={request.message ? request.feedbackId : undefined}
      >
        <AuthField
          validation={request.validation}
          key={initialCode}
          id="pairing-code"
          name="code"
          label={bg.pairing.codeLabel}
          type="text"
          inputMode="numeric"
          autoComplete="one-time-code"
          pattern="[0-9]{6}"
          maxLength={6}
          defaultValue={initialCode}
          hint={bg.pairing.codeHint}
          large
          required
        />
        <Button type="submit" size="xl" className="w-full sm:w-auto" disabled={request.pending}>
          {request.pending ? bg.pairing.submitting : bg.pairing.button}
        </Button>
      </fieldset>
      <Feedback message={request.message} id={request.feedbackId} />
      <p className="max-w-[40ch] text-xl text-fg-muted">{bg.pairing.retryHint}</p>
    </form>
  );
}

// „Изход“ (in the site header): ends the session in this browser, then opens the home
// page with a full page load, so the header is drawn again for a guest.
// First it switches web push off for this browser (W2-05, best effort, at most 1.5 s),
// so the next person using this browser doesn't get this account's alerts.
export function LogoutButton() {
  const request = useFormRequest();
  async function logout() {
    await unsubscribeFromPushBeforeLogout();
    const data = await request.post("/api/auth/logout", {});
    if (!data) return;
    if (data.ok === true) window.location.assign(ROUTES.home);
    else request.showError(bg.errors.internal);
  }
  return (
    <div className="flex flex-col items-end gap-2">
      <Button
        variant="ghost"
        size="sm"
        className="min-h-12"
        disabled={request.pending}
        onClick={logout}
      >
        {request.pending ? bg.auth.submitting : bg.auth.logoutButton}
      </Button>
      <Feedback message={request.message} id={request.feedbackId} className="text-sm" />
    </div>
  );
}
