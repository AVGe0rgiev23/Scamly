// The „Известия на телефона“ banner on /family (task W2-05): lets a family member
// switch web push on or off for THIS browser, so an alert reaches their phone even
// when Scamly is closed.
//
//   - push not set up on the server (GET /api/push/public-key → enabled: false):
//     „Известията още не са настроени.“ and no button;
//   - iPhone / iPad in a normal Safari tab: a 3-step hint (add to home screen) instead
//     of the button, because iOS only allows web push from the home screen icon (R2);
//   - otherwise: „Включи известията“ / „Изключи“, or why it can't work here.
//
// The browser asks „Разрешавате ли известия?“ ONLY after „Включи известията“ is
// pressed, never on its own: subscribeToPush() is called directly in the click
// handler (browsers, Safari above all, show the question only in answer to a tap).
// All the push logic is in src/lib/push.ts; the state rules are in pushState.ts.
//
// Look (Redesign v3 Phase 4, family.css .family-push): a wide glass banner with our
// own drawing on the left (a phone with a bell, halo waves going out from it; the
// waves are mint when push is on, amber when blocked, still when unavailable) and the
// title, the state pill, one sentence and the button on the right. On a phone the
// drawing sits above the words. The button stays secondary („Добави човек“ is the
// page's primary).
"use client";

import { useEffect, useId, useState } from "react";
import { IosInstallSteps } from "@/components/pwa/IosInstallSteps";
import { BellOff, BellRing } from "lucide-react";
import { StatusPill, type Status } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Skeleton, SkeletonText } from "@/components/ui/Skeleton";
import { bg } from "@/i18n/bg";
import {
  getPushPermission,
  isIosNeedsHomeScreen,
  isPushEnabledOnServer,
  isSubscribedToPush,
  subscribeToPush,
  unsubscribeFromPush,
} from "@/lib/push";
import {
  pushCardState,
  pushStateText,
  subscribeMessage,
  type PushCardState,
  type PushFacts,
} from "./pushState";

// The pill of each state: its meaning (colour + icon) and its one word.
const PILL: Record<PushCardState, { status: Status; text: string }> = {
  on: { status: "safe", text: bg.pushOptIn.pillOn },
  off: { status: "neutral", text: bg.pushOptIn.pillOff },
  blocked: { status: "caution", text: bg.pushOptIn.pillBlocked },
  disabled: { status: "info", text: bg.pushOptIn.pillUnavailable },
  unsupported: { status: "info", text: bg.pushOptIn.pillUnavailable },
  ios: { status: "info", text: bg.pushOptIn.pillUnavailable },
};

// Reads the facts about the server and this browser.
async function readFacts(): Promise<PushFacts> {
  const serverEnabled = await isPushEnabledOnServer();
  return {
    serverEnabled,
    iosNeedsHomeScreen: isIosNeedsHomeScreen(),
    permission: getPushPermission(),
    subscribed: serverEnabled ? await isSubscribedToPush() : false,
  };
}

export function PushOptIn() {
  const titleId = useId();
  // null = still reading the facts.
  const [facts, setFacts] = useState<PushFacts | null>(null);
  const [working, setWorking] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    // `active` stops a late answer from changing a card that is already gone.
    let active = true;
    async function load() {
      const next = await readFacts();
      if (active) setFacts(next);
    }
    void load();
    return () => {
      active = false;
    };
  }, []);

  async function turnOn() {
    setWorking(true);
    setMessage(null);
    const result = await subscribeToPush(); // asks the permission question now
    const next = await readFacts();
    setFacts(next);
    setMessage(subscribeMessage(result, next.permission));
    setWorking(false);
  }

  async function turnOff() {
    setWorking(true);
    setMessage(null);
    const ok = await unsubscribeFromPush();
    setFacts(await readFacts());
    setMessage(ok ? null : bg.pushOptIn.failed);
    setWorking(false);
  }

  const state = facts === null ? null : pushCardState(facts);

  return (
    <section aria-labelledby={titleId} className="family-push" data-state={state ?? "loading"}>
      <PushArt />
      <div className="family-push-body">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <h2 id={titleId} className="text-h3">
            {bg.pushOptIn.title}
          </h2>
          {state === null ? (
            <Skeleton className="h-7 w-28" />
          ) : (
            <StatusPill
              status={PILL[state].status}
              icon={
                state === "off" ? (
                  <BellOff className="size-[1.15em] shrink-0" aria-hidden="true" />
                ) : state === "on" ? (
                  <BellRing className="size-[1.15em] shrink-0" aria-hidden="true" />
                ) : undefined
              }
            >
              {PILL[state].text}
            </StatusPill>
          )}
        </div>
        {state === null ? (
          <div className="mt-3">
            <p role="status" className="sr-only">
              {bg.pushOptIn.checking}
            </p>
            <SkeletonText lines={2} />
            <Skeleton className="mt-4 h-12 w-48" />
          </div>
        ) : (
          <p className="mt-3 text-fg-muted" data-state={state}>
            {pushStateText(state)}
          </p>
        )}
        {state === "ios" ? <IosInstallSteps /> : null}
        {state === "off" ? (
          <Button
            variant="secondary"
            className="mt-4"
            onClick={() => void turnOn()}
            disabled={working}
          >
            {working ? bg.pushOptIn.working : bg.pushOptIn.turnOn}
          </Button>
        ) : null}
        {state === "on" ? (
          <Button
            variant="ghost"
            className="mt-4"
            onClick={() => void turnOff()}
            disabled={working}
          >
            {working ? bg.pushOptIn.working : bg.pushOptIn.turnOff}
          </Button>
        ) : null}
        {/* Always in the page, so screen readers announce a new message. */}
        <p role="status" className="mt-3 text-sm font-medium text-caution-fg empty:hidden">
          {message}
        </p>
      </div>
    </section>
  );
}

// Our own drawing (inline SVG, decoration only): a phone with a bell on its screen,
// a notification dot, and three halo waves going out from it. Colours come from
// family.css (`currentColor` + the halo gradient), so both themes are covered.
function PushArt() {
  return (
    <div className="family-push-art" aria-hidden="true">
      <svg viewBox="0 0 200 200" focusable="false">
        <defs>
          <linearGradient id="family-push-halo" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="var(--halo-1)" />
            <stop offset="55%" stopColor="var(--halo-2)" />
            <stop offset="100%" stopColor="var(--halo-3)" />
          </linearGradient>
        </defs>
        <circle className="family-push-wave" cx="100" cy="100" r="58" />
        <circle className="family-push-wave family-push-wave-2" cx="100" cy="100" r="76" />
        <circle className="family-push-wave family-push-wave-3" cx="100" cy="100" r="94" />
        <rect className="family-push-phone" x="70" y="46" width="60" height="108" rx="14" />
        <rect className="family-push-notch" x="90" y="53" width="20" height="5" rx="2.5" />
        <path
          className="family-push-bell"
          d="M100 80c-9 0-15 7-15 16v9l-5 8h40l-5-8v-9c0-9-6-16-15-16Zm-6 37a6 6 0 0 0 12 0"
        />
        <circle className="family-push-dot" cx="114" cy="82" r="6" />
        <rect className="family-push-line" x="80" y="132" width="40" height="5" rx="2.5" />
        <rect
          className="family-push-line family-push-line-short"
          x="86"
          y="141"
          width="28"
          height="4"
          rx="2"
        />
      </svg>
    </div>
  );
}
