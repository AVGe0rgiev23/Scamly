// „Свързване на телефона“ (owner only): creates a 6-digit pairing code
// (POST /api/persons/:id/pairing-codes) and shows it three ways at once:
//   - big digits in two groups („482 915“) to type on the older person's phone,
//   - a QR code with the link <our site>/svarzhi?kod=482915 (the page fills in the code),
//   - a 10-minute countdown; after that the code is shown as expired.
// „Нов код“ asks for a new code; the server cancels the old one.
// Look (Redesign v3 Phase 4, family.css): a glass slab. The digits are huge in the
// data font (`.pairing-code`), each on its own small tile; a new code turns them
// over one by one (a flip, 3D rotateX; with reduced motion they only fade in). A thin
// halo bar under them shrinks with the countdown. The QR code sits in a frame with
// corner marks and a soft scan line passing over it (still with reduced motion); the
// code itself is always black on white, so cameras read it in both themes. Before
// the first code the slab shows six empty tiles, so it is clear what will appear.
"use client";

import { Fragment, useEffect, useState, useSyncExternalStore, type CSSProperties } from "react";
import { ROUTES } from "@/config/routes";
import { Button } from "@/components/ui/Button";
import { cn } from "@/components/ui/cn";
import { bg } from "@/i18n/bg";
import { callApi } from "./api";
import { FormMessage, type FormNotice } from "./fields";
import { CODE_LIFETIME_MS, fill, formatCountdown, spellDigits } from "./format";
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
    <div className="family-pairing flex flex-col items-start gap-4">
      <p className="max-w-[62ch] text-fg-muted">
        {fill(bg.family.pairingIntro, { address: `${host}${ROUTES.pair}` })}
      </p>
      <p className="text-sm text-fg-muted">{bg.family.pairingRules}</p>

      {pairing !== null && !expired ? (
        <div className="family-code-slab appear w-full">
          <div className="min-w-0">
            <p className="eyebrow">{bg.family.codeLabel}</p>
            <p className="pairing-code tabular mt-3 font-mono whitespace-nowrap text-fg">
              {/* key: a new code is a new element, so its digits turn over again. */}
              <span key={pairing.code} aria-hidden="true" className="family-digits">
                {pairing.code.split("").map((digit, index) => (
                  <Fragment key={index}>
                    {index === 3 ? <span className="family-digit-gap"> </span> : null}
                    <span className="family-digit" style={{ "--i": index } as CSSProperties}>
                      {digit}
                    </span>
                  </Fragment>
                ))}
              </span>
              <span className="sr-only">{spellDigits(pairing.code)}</span>
            </p>
            <div className="family-countdown" aria-hidden="true">
              <span
                style={
                  {
                    "--left": Math.max(0, Math.min(1, msLeft / CODE_LIFETIME_MS)),
                  } as CSSProperties
                }
              />
            </div>
            <p className="tabular mt-3 font-mono text-sm text-fg-muted">
              {fill(bg.family.codeTimeLeft, { time: formatCountdown(msLeft) })}
            </p>
          </div>
          {/* The QR picture is its own light tile (white with a quiet zone) in a frame. */}
          <div className="family-qr">
            <div className="w-full max-w-60 min-w-[200px]">
              <QrCode text={pairing.link} label={bg.family.qrLabel} />
            </div>
          </div>
        </div>
      ) : pairing === null ? (
        <div className="family-code-slab family-code-slab-empty w-full" aria-hidden="true">
          <span className="family-digits">
            {[0, 1, 2, 3, 4, 5].map((index) => (
              <Fragment key={index}>
                {index === 3 ? <span className="family-digit-gap" /> : null}
                <span className="family-digit family-digit-empty" />
              </Fragment>
            ))}
          </span>
        </div>
      ) : null}

      {/* Read aloud once when the code appears and once when it expires (not every second). */}
      <p role="status" className={cn(expired ? "family-expired w-full" : "sr-only")}>
        {pairing === null ? "" : expired ? bg.family.codeExpired : bg.family.codeReady}
      </p>

      <Button
        variant={pairing === null ? "primary" : "secondary"}
        onClick={createCode}
        disabled={pending}
        loading={pending}
      >
        {pending
          ? bg.family.creatingCode
          : pairing === null
            ? bg.family.pairingButton
            : bg.family.newCode}
      </Button>
      <div className="w-full empty:hidden">
        <FormMessage notice={notice} />
      </div>
    </div>
  );
}
