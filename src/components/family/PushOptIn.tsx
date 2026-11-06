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
"use client";

import { useEffect, useId, useState } from "react";
import { IosInstallSteps } from "@/components/pwa/IosInstallSteps";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { bg } from "@/i18n/bg";
import {
  getPushPermission,
  isIosNeedsHomeScreen,
  isPushEnabledOnServer,
  isSubscribedToPush,
  subscribeToPush,
  unsubscribeFromPush,
} from "@/lib/push";
import { pushCardState, pushStateText, subscribeMessage, type PushFacts } from "./pushState";

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
    <Card className="push-card" role="region" aria-labelledby={titleId}>
      <h2 id={titleId}>{bg.pushOptIn.title}</h2>
      {state === null ? (
        <p role="status" className="muted">
          {bg.pushOptIn.checking}
        </p>
      ) : (
        <p className="push-state" data-state={state}>
          {pushStateText(state)}
        </p>
      )}
      {state === "ios" ? <IosInstallSteps /> : null}
      {state === "off" ? (
        <Button onClick={() => void turnOn()} disabled={working}>
          {working ? bg.pushOptIn.working : bg.pushOptIn.turnOn}
        </Button>
      ) : null}
      {state === "on" ? (
        <Button variant="secondary" onClick={() => void turnOff()} disabled={working}>
          {working ? bg.pushOptIn.working : bg.pushOptIn.turnOff}
        </Button>
      ) : null}
      {/* Always in the page, so screen readers announce a new message. */}
      <p role="status" className="push-message">
        {message}
      </p>
    </Card>
  );
}
