// Unit tests for the pure parts of the browser push helper (src/lib/push.ts, W2-05).
// The parts that need a real browser (permission, service worker) are tested by hand
// on a phone.

import { describe, expect, it, vi } from "vitest";
import {
  isIosDevice,
  isPushSupported,
  needsHomeScreenForPush,
  sameBytes,
  unsubscribeFromPushBeforeLogout,
  urlBase64ToUint8Array,
} from "@/lib/push";

// A constructor-like function, as browsers have for PushManager and Notification.
function FakeClass() {}

const IPHONE =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1 Mobile/15E148 Safari/604.1";
const IPAD_DESKTOP_MODE =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1 Safari/605.1.15";
const ANDROID_CHROME =
  "Mozilla/5.0 (Linux; Android 15; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36";

describe("isPushSupported", () => {
  it("is true with service workers, PushManager and Notification", () => {
    expect(
      isPushSupported({
        navigator: { serviceWorker: {} },
        PushManager: FakeClass,
        Notification: FakeClass,
      }),
    ).toBe(true);
  });

  it("is false when any part is missing (e.g. iPhone Safari tab, plain http, old browser)", () => {
    expect(
      isPushSupported({ navigator: {}, PushManager: FakeClass, Notification: FakeClass }),
    ).toBe(false);
    expect(isPushSupported({ navigator: { serviceWorker: {} }, Notification: FakeClass })).toBe(
      false,
    );
    expect(isPushSupported({ navigator: { serviceWorker: {} }, PushManager: FakeClass })).toBe(
      false,
    );
    expect(isPushSupported({})).toBe(false);
  });

  it("is false in Node.js (the default scope has no service workers)", () => {
    expect(isPushSupported()).toBe(false);
  });
});

describe("iPhone / iPad home-screen hint", () => {
  it("recognises iPhone and an iPad that says 'Macintosh', but not a Mac or Android", () => {
    expect(isIosDevice({ userAgent: IPHONE, maxTouchPoints: 5, standalone: false })).toBe(true);
    expect(
      isIosDevice({ userAgent: IPAD_DESKTOP_MODE, maxTouchPoints: 5, standalone: false }),
    ).toBe(true);
    expect(
      isIosDevice({ userAgent: IPAD_DESKTOP_MODE, maxTouchPoints: 0, standalone: false }),
    ).toBe(false);
    expect(isIosDevice({ userAgent: ANDROID_CHROME, maxTouchPoints: 5, standalone: false })).toBe(
      false,
    );
  });

  it("shows the hint only on iOS outside the home-screen app", () => {
    expect(
      needsHomeScreenForPush({ userAgent: IPHONE, maxTouchPoints: 5, standalone: false }),
    ).toBe(true);
    expect(needsHomeScreenForPush({ userAgent: IPHONE, maxTouchPoints: 5, standalone: true })).toBe(
      false,
    );
    expect(
      needsHomeScreenForPush({ userAgent: ANDROID_CHROME, maxTouchPoints: 5, standalone: false }),
    ).toBe(false);
  });
});

describe("urlBase64ToUint8Array", () => {
  it("decodes base64url without padding, like Node's Buffer does", () => {
    // Bytes chosen so the text contains "-" and "_" and needs padding.
    const bytes = Uint8Array.from([0xfb, 0xff, 0xbf, 0x00, 0x10, 0x83, 0x3e]);
    const text = Buffer.from(bytes).toString("base64url");
    expect(text).toMatch(/[-_]/);
    expect(text.endsWith("=")).toBe(false);

    expect(Array.from(urlBase64ToUint8Array(text))).toEqual(Array.from(bytes));
  });

  it("turns an 87-character VAPID public key into 65 bytes starting with 0x04", () => {
    const key = Buffer.concat([Buffer.from([4]), Buffer.alloc(64, 7)]).toString("base64url");
    expect(key).toHaveLength(87);
    const bytes = urlBase64ToUint8Array(key);
    expect(bytes).toHaveLength(65);
    expect(bytes[0]).toBe(4);
  });

  it("decodes an empty string to no bytes", () => {
    expect(urlBase64ToUint8Array("")).toHaveLength(0);
  });
});

describe("sameBytes", () => {
  it("compares length and every byte", () => {
    expect(sameBytes(Uint8Array.from([1, 2]), Uint8Array.from([1, 2]))).toBe(true);
    expect(sameBytes(Uint8Array.from([1, 2]), Uint8Array.from([1, 3]))).toBe(false);
    expect(sameBytes(Uint8Array.from([1, 2]), Uint8Array.from([1, 2, 3]))).toBe(false);
  });
});

describe("unsubscribeFromPushBeforeLogout", () => {
  it("waits for a quick unsubscribe", async () => {
    let done = false;
    await unsubscribeFromPushBeforeLogout(async () => {
      done = true;
      return true;
    });
    expect(done).toBe(true);
  });

  it("never fails, even when unsubscribing throws", async () => {
    await expect(
      unsubscribeFromPushBeforeLogout(() => Promise.reject(new Error("offline"))),
    ).resolves.toBeUndefined();
  });

  it("gives up after the timeout, so „Изход“ never hangs", async () => {
    vi.useFakeTimers();
    try {
      const stuck = () => new Promise<boolean>(() => {}); // never finishes
      const logout = unsubscribeFromPushBeforeLogout(stuck, 1500);
      await vi.advanceTimersByTimeAsync(1500);
      await expect(logout).resolves.toBeUndefined();
    } finally {
      vi.useRealTimers();
    }
  });
});
