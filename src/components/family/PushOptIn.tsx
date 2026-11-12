// The „Известия на телефона“ card on /family (task W2-05): lets a family member switch
// web push on or off for THIS browser, so an alert reaches their phone even when
// Scamly is closed.
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
// Look: a compact panel. The state is a StatusPill (icon + one word: „Включени“,
// „Изключени“, „Блокирани“, „Недостъпни“) next to the title, the sentence below
// explains it, and the button is secondary („Добави човек“ is the page's primary).
"use client";

import { useEffect, useId, useState } from "react";
import { IosInstallSteps } from "@/components/pwa/IosInstallSteps";
import { BellOff, BellRing } from "lucide-react";
import { StatusPill, type Status } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
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
    <Card as="section" aria-labelledby={titleId}>
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
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
        <Button variant="ghost" className="mt-4" onClick={() => void turnOff()} disabled={working}>
          {working ? bg.pushOptIn.working : bg.pushOptIn.turnOff}
        </Button>
      ) : null}
      {/* Always in the page, so screen readers announce a new message. */}
      <p role="status" className="mt-3 text-sm font-medium text-caution-fg empty:hidden">
        {message}
      </p>
    </Card>
  );
}
