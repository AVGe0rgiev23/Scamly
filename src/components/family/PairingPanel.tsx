// „Свързване на телефона“ (owner only): creates a 6-digit pairing code
// (POST /api/persons/:id/pairing-codes) and shows it three ways at once:
//   - big digits in two groups („482 915“) to type on the older person's phone,
//   - a QR code with the link <our site>/svarzhi?kod=482915 (the page fills in the code),
//   - a 10-minute countdown; after that the code is shown as expired.
// „Нов код“ asks for a new code; the server cancels the old one.
"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { ROUTES } from "@/config/routes";
import { Button } from "@/components/ui/Button";
import { bg } from "@/i18n/bg";
import { callApi } from "./api";
import { FormMessage, type FormNotice } from "./fields";
import { CODE_LIFETIME_MS, fill, formatCode, formatCountdown, spellDigits } from "./format";
import { QrCode } from "./QrCode";

// Our own address never changes while the page is open, so there is nothing to
// subscribe to; useSyncExternalStore just reads it in the browser and uses "" on
// the server (which doesn't know which address the visitor typed).
function subscribeToNothing() {
  return () => {};
}
function readHost() {
  return window.location.host;
}
function serverHost() {
  return "";
}

type PairingCode = {
  code: string;
  link: string; // what the QR code opens
  deadline: number; // when the code expires, in this browser's clock (ms since 1970)
};

export function PairingPanel({ personId }: { personId: string }) {
  const [pairing, setPairing] = useState<PairingCode | null>(null);
  // The current time, ticking once a second while a code is shown.
  const [now, setNow] = useState(0);
  const [pending, setPending] = useState(false);
  const [notice, setNotice] = useState<FormNotice>(null);
  const host = useSyncExternalStore(subscribeToNothing, readHost, serverHost);

  useEffect(() => {
    if (pairing === null) return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [pairing]);

  async function createCode() {
    if (pending) return;
    setPending(true);
    setNotice(null);
    const result = await callApi<{ code: string; expiresAt: string }>(
      `/api/persons/${personId}/pairing-codes`,
      "POST",
    );
    setPending(false);
    if (!result.ok) {
      setNotice({ kind: "error", text: result.messageBg });
      return;
    }
    const receivedAt = Date.now();
    // The server's expiry, but never more than 10 minutes from now: if this
    // computer's clock is wrong, the countdown ends too early, never too late.
    const deadline = Math.min(Date.parse(result.data.expiresAt), receivedAt + CODE_LIFETIME_MS);
    const origin = window.location.origin;
    setPairing({
      code: result.data.code,
      link: `${origin}${ROUTES.pair}?kod=${result.data.code}`,
      deadline,
    });
    setNow(receivedAt);
  }

  const msLeft = pairing === null ? 0 : pairing.deadline - now;
  const expired = pairing !== null && msLeft <= 0;

  return (
    <div className="pairing">
      <p className="muted">{fill(bg.family.pairingIntro, { address: `${host}${ROUTES.pair}` })}</p>
      <p className="muted">{bg.family.pairingRules}</p>

      {pairing !== null && !expired ? (
        <div className="pairing-code-box">
          <p className="pairing-code-label">{bg.family.codeLabel}</p>
          <p className="pairing-code">
            <span aria-hidden="true">{formatCode(pairing.code)}</span>
            <span className="sr-only">{spellDigits(pairing.code)}</span>
          </p>
          <QrCode text={pairing.link} label={bg.family.qrLabel} />
          <p className="pairing-timer">
            {fill(bg.family.codeTimeLeft, { time: formatCountdown(msLeft) })}
          </p>
        </div>
      ) : null}

      {/* Read aloud once when the code appears and once when it expires (not every second). */}
      <p role="status" className={expired ? "form-message form-message-error" : "sr-only"}>
        {pairing === null ? "" : expired ? bg.family.codeExpired : bg.family.codeReady}
      </p>

      <Button onClick={createCode} disabled={pending}>
        {pending
          ? bg.family.creatingCode
          : pairing === null
            ? bg.family.pairingButton
            : bg.family.newCode}
      </Button>
      <FormMessage notice={notice} />
    </div>
  );
}
