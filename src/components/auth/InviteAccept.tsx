// The invite page /pokana?t=<token> (W2-14): another relative accepts an invite and
// becomes a trusted contact of a protected person (API: POST /api/invites/redeem, 3.28).
//
//   - guest: a short explanation and „Вход“ / „Регистрация“, which come back here
//     after login (the safe `next` parameter, routes.ts safeNextPath);
//   - family member: the token is sent AT ONCE, then removed from the address bar
//     (history.replaceState), then the result is shown;
//   - any other role: „Тази покана е за профил на близък.“
//
// We don't know whose invite it is before it is used: the API reveals the person's
// name only to the family member who redeems it, so a leaked link shows nothing.
"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { callApi } from "@/components/family/api";
import { ROUTES, withNext } from "@/config/routes";
import { bg } from "@/i18n/bg";
import { RedeemInviteSchema } from "@/schemas/invites";

// The answer of POST /api/invites/redeem.
type Redeemed = { protectedPersonId: string; personName: string; priority: number };

// What the page shows. A "union" of shapes, like a Python Enum whose values carry data.
type View =
  | { kind: "checking" }
  | { kind: "guest" }
  | { kind: "wrongRole" }
  | { kind: "redeeming" }
  | { kind: "success"; result: Redeemed }
  | { kind: "error"; message: string };

// Replaces {name} and {n} in a text from bg.ts.
function fill(text: string, values: Record<string, string>): string {
  return text.replace(/\{(\w+)\}/g, (whole, key: string) => values[key] ?? whole);
}

// Removes ?t=… from the address bar WITHOUT loading the page again, so the used
// token is not kept in this tab's address, a bookmark or a shared screenshot.
function removeTokenFromAddressBar() {
  window.history.replaceState(null, "", ROUTES.invite);
}

export function InviteAccept() {
  // The token is read once: after replaceState the address no longer has it.
  const params = useSearchParams();
  const [token] = useState(() => params.get("t") ?? "");
  const tokenIsValid = RedeemInviteSchema.safeParse({ token }).success;
  const [view, setView] = useState<View>({ kind: "checking" });
  // A ref changes at once, so the token is never sent twice (e.g. React's double
  // effect run in development).
  const started = useRef(false);

  useEffect(() => {
    if (!tokenIsValid || started.current) return;
    started.current = true;
    async function run() {
      // 1. Who is looking? 401 = a guest.
      const me = await callApi<{ role: string }>("/api/me");
      if (!me.ok) {
        setView(me.status === 401 ? { kind: "guest" } : { kind: "error", message: me.messageBg });
        return;
      }
      if (me.data.role !== "family") {
        setView({ kind: "wrongRole" });
        return;
      }
      // 2. A family member: send the token now.
      setView({ kind: "redeeming" });
      const result = await callApi<Redeemed>("/api/invites/redeem", "POST", { token });
      // Any answer from the server means the token has done its job here. Only
      // without a connection (status 0) it stays, so reloading the page tries again.
      if (result.status !== 0) removeTokenFromAddressBar();
      if (result.ok) setView({ kind: "success", result: result.data });
      else if (result.status === 401) setView({ kind: "guest" });
      else setView({ kind: "error", message: result.messageBg });
    }
    void run();
  }, [token, tokenIsValid]);

  // A broken link: the same message as a wrong, expired or used invite.
  if (!tokenIsValid) {
    return <InviteError message={bg.invites.invalidInvite} />;
  }

  if (view.kind === "checking" || view.kind === "redeeming") {
    return (
      <p role="status" className="muted">
        {view.kind === "checking" ? bg.common.loading : bg.invitePage.redeeming}
      </p>
    );
  }

  if (view.kind === "guest") {
    const back = `${ROUTES.invite}?t=${token}`;
    return (
      <div className="auth-form">
        <p>{bg.invitePage.guestText}</p>
        <Link
          className="button button-primary"
          href={withNext(ROUTES.login, back)}
          prefetch={false}
        >
          {bg.invitePage.loginButton}
        </Link>
        <Link
          className="button button-secondary"
          href={withNext(ROUTES.register, back)}
          prefetch={false}
        >
          {bg.invitePage.registerButton}
        </Link>
        <p className="muted">{bg.invitePage.registerHint}</p>
      </div>
    );
  }

  if (view.kind === "wrongRole") {
    return (
      <div className="auth-form">
        <p className="form-message form-message-error" role="alert">
          {bg.invitePage.wrongRole}
        </p>
        <p className="muted">{bg.invitePage.wrongRoleHint}</p>
      </div>
    );
  }

  if (view.kind === "error") {
    return <InviteError message={view.message} />;
  }

  const name = view.result.personName;
  return (
    <div className="auth-form">
      <p className="form-message form-message-success" role="status">
        {fill(bg.invitePage.success, { name, n: String(view.result.priority) })}
      </p>
      <p>{fill(bg.invitePage.successNext, { name })}</p>
      <Link
        className="button button-primary"
        href={`${ROUTES.family}/${view.result.protectedPersonId}`}
      >
        {fill(bg.invitePage.openPerson, { name })}
      </Link>
    </div>
  );
}

// An error from the API (already in Bulgarian) and the way back.
function InviteError({ message }: { message: string }) {
  return (
    <div className="auth-form">
      <p className="form-message form-message-error" role="alert">
        {message}
      </p>
      <Link className="auth-action-link" href={ROUTES.home}>
        {bg.common.backHome}
      </Link>
    </div>
  );
}
