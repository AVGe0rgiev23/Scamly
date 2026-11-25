// The home screen of the older person's phone: ONE giant round button „Обаждат ми се
// за пари!“ with a slow, faint halo breathing around it (it invites the press), a
// quiet line „Можете да проверите и след като затворите.“ with the button for a call
// that has already ended, and „Обади се на …“ if we already know who to call.
// Pressing a button starts the check (the family is alerted at once) and opens the
// first question.
//
// The halo is plain CSS (protected.css .check-cta-halo): no WebGL on this screen. It
// stands still with reduced motion and on weak phones (≤ 4 cores or ≤ 4 GB memory).

import { PhoneIncoming } from "lucide-react";
import { useSyncExternalStore, type ReactNode } from "react";
import { Button } from "@/components/ui/Button";
import { isLowEndDevice } from "@/components/ui/halo/haloMath";
import { bg } from "@/i18n/bg";
import type { CallContactDto } from "@/schemas/checks";
import { CallContactButton } from "./CallContactButton";

type CheckHomeProps = {
  contact: CallContactDto | null;
  onStart: (afterCall: boolean) => void;
  children?: ReactNode;
};

// Is this a weak phone? Read with useSyncExternalStore (like VoiceInput does), so the
// server (no phone: answer "weak", the halo stays still) and the browser can differ
// without a warning. `deviceMemory` exists only in Chrome, so it is read carefully.
function noChanges() {
  return () => {};
}
function isWeakPhone(): boolean {
  const memory = (navigator as Navigator & { deviceMemory?: number }).deviceMemory;
  return isLowEndDevice({
    webgl2: true,
    reducedMotion: false,
    hardwareConcurrency: navigator.hardwareConcurrency,
    deviceMemory: memory,
  });
}
function weakOnServer(): boolean {
  return true;
}

export function CheckHome({ contact, onStart, children }: CheckHomeProps) {
  const weak = useSyncExternalStore(noChanges, isWeakPhone, weakOnServer);
  return (
    <div className="check-home flex flex-col gap-5">
      <h1 className="sr-only">{bg.protectedCheck.title}</h1>
      {/* The one thing on this screen: a circle almost as wide as the phone. */}
      <div className="check-cta-stage" data-still={weak || undefined}>
        <span className="check-cta-halo" aria-hidden="true">
          <span />
          <span />
        </span>
        <button
          type="button"
          className="check-cta pressable cursor-pointer"
          onClick={() => onStart(false)}
        >
          <span className="check-cta-icon" aria-hidden="true">
            <PhoneIncoming strokeWidth={1.75} />
          </span>
          <span>{bg.protectedCheck.bigButton}</span>
        </button>
      </div>
      <div className="flex flex-col gap-3">
        <p className="text-center text-xl text-fg-muted">{bg.protectedCheck.afterCallHint}</p>
        <Button variant="secondary" size="xl" onClick={() => onStart(true)}>
          {bg.protectedCheck.afterCall}
        </Button>
        {contact === null ? null : <CallContactButton contact={contact} variant="secondary" />}
      </div>
      {children}
    </div>
  );
}
