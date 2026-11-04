// Unit tests for the web push sender (pushSender.ts, task W2-05). The web-push library
// is replaced by a fake (vi.mock), so nothing goes over the network.

import { beforeEach, describe, expect, it, vi } from "vitest";

// vi.hoisted / vi.mock run before the imports below, so pushSender.ts gets the fake.
const fake = vi.hoisted(() => {
  // The library's error class: an Error with the push service's HTTP status code.
  class WebPushError extends Error {
    statusCode: number;
    constructor(message: string, statusCode: number) {
      super(message);
      this.statusCode = statusCode;
    }
  }
  return { sendNotification: vi.fn(), WebPushError };
});
vi.mock("web-push", () => ({
  default: { sendNotification: fake.sendNotification, WebPushError: fake.WebPushError },
}));

import { createWebPushSender, PUSH_TTL_SECONDS } from "@/server/notifications/pushSender";

const CONFIG = { publicKey: "pub", privateKey: "priv", subject: "mailto:x@example.invalid" };
const TARGET = {
  endpoint: "https://fcm.googleapis.com/fcm/send/abc",
  keys: { p256dh: "p", auth: "a" },
};
const MESSAGE = { title: "Заглавие", body: "Текст", url: "/family/alerts?check=1", tag: "check-1" };

beforeEach(() => {
  fake.sendNotification.mockReset();
});

describe("createWebPushSender", () => {
  it("sends the JSON message with a 10-minute TTL, high urgency and our VAPID keys", async () => {
    fake.sendNotification.mockResolvedValue({ statusCode: 201 });

    expect(await createWebPushSender(CONFIG)(TARGET, MESSAGE)).toBe("sent");

    const [target, body, options] = fake.sendNotification.mock.calls[0] ?? [];
    expect(target).toEqual(TARGET);
    expect(JSON.parse(body as string)).toEqual(MESSAGE);
    expect(options).toMatchObject({
      TTL: PUSH_TTL_SECONDS,
      urgency: "high",
      vapidDetails: CONFIG,
    });
    expect(PUSH_TTL_SECONDS).toBe(600);
  });

  it("answers 'gone' for HTTP 404 and 410", async () => {
    for (const status of [404, 410]) {
      fake.sendNotification.mockRejectedValueOnce(new fake.WebPushError("gone", status));
      expect(await createWebPushSender(CONFIG)(TARGET, MESSAGE)).toBe("gone");
    }
  });

  it("throws a short error with only the status for other answers", async () => {
    fake.sendNotification.mockRejectedValueOnce(
      new fake.WebPushError(`bad request for ${TARGET.endpoint}`, 400),
    );
    const error = await createWebPushSender(CONFIG)(TARGET, MESSAGE).catch((e: unknown) => e);
    expect(String(error)).toBe("Error: push service answered HTTP 400");
  });

  it("passes network errors on (the channel records them as failed)", async () => {
    fake.sendNotification.mockRejectedValueOnce(new Error("socket hang up"));
    await expect(createWebPushSender(CONFIG)(TARGET, MESSAGE)).rejects.toThrow("socket hang up");
  });
});
