// What the „Известия на телефона“ card (PushOptIn.tsx, task W2-05) shows, worked out
// from a few facts about the server and this browser. Pure functions, no browser
// needed, so they are unit-tested in pushState.test.ts.

import { bg } from "@/i18n/bg";
import type { SubscribeResult } from "@/lib/push";

// The facts the card reads once when it opens (and again after each button press).
// Like a small Python dataclass.
export type PushFacts = {
  serverEnabled: boolean; // GET /api/push/public-key said enabled: true
  iosNeedsHomeScreen: boolean; // iPhone / iPad in a normal Safari tab
  permission: NotificationPermission | "unsupported"; // "granted" | "denied" | "default"
  subscribed: boolean; // this browser already has a push subscription
};

// The card's states. Like a Python Literal[...].
//   disabled     push is not set up on the server: text only, no button
//   ios          iPhone not opened from the home screen: the 3-step hint, no button
//   unsupported  this browser can't do web push: text only
//   blocked      the person (or the browser) blocked notifications for this site
//   on           push is on in this browser: „Изключи“
//   off          push is off: „Включи известията“
export type PushCardState = "disabled" | "ios" | "unsupported" | "blocked" | "on" | "off";

// The order matters: a server without push wins over everything, and the iPhone hint
// comes before "unsupported" (in a Safari tab PushManager is missing, but adding
// Scamly to the home screen fixes that).
export function pushCardState(facts: PushFacts): PushCardState {
  if (!facts.serverEnabled) {
    return "disabled";
  }
  if (facts.iosNeedsHomeScreen) {
    return "ios";
  }
  if (facts.permission === "unsupported") {
    return "unsupported";
  }
  if (facts.permission === "denied") {
    return "blocked";
  }
  if (facts.permission === "granted" && facts.subscribed) {
    return "on";
  }
  return "off";
}

// The text that explains each state.
export function pushStateText(state: PushCardState): string {
  const texts: Record<PushCardState, string> = {
    disabled: bg.pushOptIn.disabled,
    ios: bg.pushOptIn.iosIntro,
    unsupported: bg.pushOptIn.unsupported,
    blocked: bg.pushOptIn.blocked,
    on: bg.pushOptIn.on,
    off: bg.pushOptIn.off,
  };
  return texts[state];
}

// An extra message after „Включи известията“, or null when the new state already says
// everything (e.g. "subscribed" → the card shows „Известията са включени…“).
// "denied" while the permission is still "default" means the person closed the
// browser's question without answering: they may try again.
export function subscribeMessage(
  result: SubscribeResult,
  permission: NotificationPermission | "unsupported",
): string | null {
  if (result === "failed") {
    return bg.pushOptIn.failed;
  }
  if (result === "denied" && permission === "default") {
    return bg.pushOptIn.notAllowed;
  }
  return null;
}
