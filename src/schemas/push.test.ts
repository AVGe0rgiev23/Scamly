// Unit tests for the web push input rules (src/schemas/push.ts, task W2-05).

import { describe, expect, it } from "vitest";
import { bg } from "@/i18n/bg";
import {
  isAllowedPushEndpoint,
  PushSubscriptionSchema,
  PushUnsubscribeSchema,
} from "@/schemas/push";

// Shaped like a real browser subscription (made-up values).
const VALID = {
  endpoint: "https://fcm.googleapis.com/fcm/send/abc123:APA91bFakeToken",
  expirationTime: null,
  keys: {
    p256dh: "B" + "x".repeat(86), // 87 characters, like a real key
    auth: "a1B2c3D4e5F6g7H8i9J0kL", // 22 characters
  },
};

describe("isAllowedPushEndpoint", () => {
  it("accepts the push services of Chrome, Firefox, Safari and Edge", () => {
    expect(isAllowedPushEndpoint("https://fcm.googleapis.com/fcm/send/x")).toBe(true);
    expect(isAllowedPushEndpoint("https://updates.push.services.mozilla.com/wpush/v2/x")).toBe(
      true,
    );
    expect(isAllowedPushEndpoint("https://web.push.apple.com/QGx")).toBe(true);
    expect(isAllowedPushEndpoint("https://wns2-db5p.notify.windows.com/w/?token=x")).toBe(true);
  });

  it("rejects other hosts, look-alike hosts, http, odd ports and garbage (SSRF)", () => {
    expect(isAllowedPushEndpoint("https://evil.example/fcm.googleapis.com")).toBe(false);
    expect(isAllowedPushEndpoint("https://fcm.googleapis.com.evil.example/x")).toBe(false);
    expect(isAllowedPushEndpoint("https://notfcm.googleapis.com/x")).toBe(false);
    expect(isAllowedPushEndpoint("http://fcm.googleapis.com/fcm/send/x")).toBe(false);
    expect(isAllowedPushEndpoint("https://fcm.googleapis.com:8443/x")).toBe(false);
    expect(isAllowedPushEndpoint("https://user:pw@fcm.googleapis.com/x")).toBe(false);
    expect(isAllowedPushEndpoint("https://127.0.0.1/x")).toBe(false);
    expect(isAllowedPushEndpoint("not a url")).toBe(false);
  });
});

describe("PushSubscriptionSchema", () => {
  it("accepts what PushSubscription.toJSON() gives and drops unknown keys", () => {
    const parsed = PushSubscriptionSchema.parse({ ...VALID, userId: "someone-else" });
    expect(parsed).toEqual({ endpoint: VALID.endpoint, keys: VALID.keys });
  });

  it("rejects a missing or invalid endpoint with the Bulgarian message", () => {
    for (const endpoint of [undefined, "", "http://fcm.googleapis.com/x", "https://a.example/"]) {
      const result = PushSubscriptionSchema.safeParse({ ...VALID, endpoint });
      expect(result.success).toBe(false);
      expect(result.error?.issues[0]?.message).toBe(bg.push.subscriptionInvalid);
    }
  });

  it("rejects an endpoint longer than the database allows", () => {
    const endpoint = "https://fcm.googleapis.com/" + "x".repeat(1000);
    expect(PushSubscriptionSchema.safeParse({ ...VALID, endpoint }).success).toBe(false);
  });

  it("rejects missing, too short, too long or non-base64url keys", () => {
    const badKeys = [
      undefined,
      { p256dh: VALID.keys.p256dh },
      { p256dh: "short", auth: VALID.keys.auth },
      { p256dh: VALID.keys.p256dh, auth: "x".repeat(101) },
      { p256dh: VALID.keys.p256dh, auth: "not base64 at all!!" },
    ];
    for (const keys of badKeys) {
      expect(PushSubscriptionSchema.safeParse({ ...VALID, keys }).success).toBe(false);
    }
  });
});

describe("PushUnsubscribeSchema", () => {
  it("needs only a valid endpoint", () => {
    expect(PushUnsubscribeSchema.parse({ endpoint: VALID.endpoint })).toEqual({
      endpoint: VALID.endpoint,
    });
    expect(PushUnsubscribeSchema.safeParse({ endpoint: "https://evil.example/" }).success).toBe(
      false,
    );
  });
});
