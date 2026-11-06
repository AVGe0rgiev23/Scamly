// Unit tests for the state rules of the „Известия на телефона“ card (pushState.ts, W2-05).

import { describe, expect, it } from "vitest";
import { bg } from "@/i18n/bg";
import {
  pushCardState,
  pushStateText,
  subscribeMessage,
  type PushCardState,
  type PushFacts,
} from "./pushState";

// A browser that can do push, with push on the server, not yet asked.
const READY: PushFacts = {
  serverEnabled: true,
  iosNeedsHomeScreen: false,
  permission: "default",
  subscribed: false,
};

describe("pushCardState", () => {
  it("is off before the person was asked", () => {
    expect(pushCardState(READY)).toBe("off");
  });

  it("is on only with permission AND a subscription", () => {
    expect(pushCardState({ ...READY, permission: "granted", subscribed: true })).toBe("on");
    // Allowed earlier, but the subscription is gone (e.g. after „Изход“): off again.
    expect(pushCardState({ ...READY, permission: "granted", subscribed: false })).toBe("off");
  });

  it("is blocked when notifications are denied", () => {
    expect(pushCardState({ ...READY, permission: "denied" })).toBe("blocked");
  });

  it("is unsupported when the browser has no web push", () => {
    expect(pushCardState({ ...READY, permission: "unsupported" })).toBe("unsupported");
  });

  it("shows the iPhone hint before „unsupported“ (a Safari tab has no PushManager)", () => {
    expect(pushCardState({ ...READY, iosNeedsHomeScreen: true, permission: "unsupported" })).toBe(
      "ios",
    );
  });

  it("says „not set up“ when the server has push off, whatever the browser can do", () => {
    expect(pushCardState({ ...READY, serverEnabled: false })).toBe("disabled");
    expect(pushCardState({ ...READY, serverEnabled: false, iosNeedsHomeScreen: true })).toBe(
      "disabled",
    );
  });
});

describe("pushStateText", () => {
  it("has a different Bulgarian text for every state", () => {
    const states: PushCardState[] = ["disabled", "ios", "unsupported", "blocked", "on", "off"];
    const texts = states.map(pushStateText);
    expect(new Set(texts).size).toBe(states.length);
    expect(pushStateText("disabled")).toBe("Известията още не са настроени.");
  });
});

describe("subscribeMessage", () => {
  it("says nothing extra when the new state explains it", () => {
    expect(subscribeMessage("subscribed", "granted")).toBeNull();
    expect(subscribeMessage("denied", "denied")).toBeNull(); // the card shows „blocked“
    expect(subscribeMessage("disabled", "granted")).toBeNull();
  });

  it("invites a retry when the question was closed without an answer", () => {
    expect(subscribeMessage("denied", "default")).toBe(bg.pushOptIn.notAllowed);
  });

  it("reports a failure", () => {
    expect(subscribeMessage("failed", "granted")).toBe(bg.pushOptIn.failed);
  });
});
