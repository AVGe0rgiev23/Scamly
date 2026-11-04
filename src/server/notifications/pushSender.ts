// Sends ONE web push notification to ONE browser (task W2-05). A thin wrapper around
// the `web-push` library, so the rest of our code (pushChannel.ts) never touches the
// library and the tests can pass a fake sender instead.
//
// How web push works, in short:
//   1. The family member's browser subscribes at its push service (Google, Mozilla,
//      Apple, Microsoft) with our PUBLIC VAPID key and gets an endpoint URL + two keys.
//   2. We store those (push_subscriptions). To notify, we POST to the endpoint:
//      the message is ENCRYPTED with the browser's keys (only that browser can read
//      it, not the push service), and SIGNED with our PRIVATE VAPID key (so the push
//      service knows the message really comes from the server the browser trusted).
//   3. The push service wakes the phone; our service worker (public/sw.js) shows it.
// `web-push` does the encryption and the signature for us.

import "server-only";
import webpush from "web-push";

// The settings the sender needs (from src/lib/env.ts; see getPushConfig()).
export type VapidConfig = {
  publicKey: string;
  privateKey: string;
  subject: string; // "mailto:…" or "https://…"
};

// Where to send: what the browser gave us when it subscribed.
export type PushTarget = {
  endpoint: string;
  keys: { p256dh: string; auth: string };
};

// What the service worker gets (public/sw.js reads exactly these four fields).
// Only fixed texts from bg.ts, a name and an id: never call details or phone numbers.
export type PushMessage = {
  title: string;
  body: string;
  url: string; // a page of our own site, opened when the notification is tapped
  tag: string; // the check id: a second message for the same check replaces the first
};

// "sent" = the push service accepted it; "gone" = the push service says this
// subscription no longer exists (HTTP 404 or 410), so it should be deleted.
// Any other problem is thrown as an Error.
export type PushSendResult = "sent" | "gone";

// A function that sends one message (like Python's Callable[[PushTarget, PushMessage],
// Awaitable[PushSendResult]]). The real one is below; tests write their own.
export type PushSender = (target: PushTarget, message: PushMessage) => Promise<PushSendResult>;

// How long the push service keeps trying to deliver to a phone that is off: an alert
// about a call happening NOW is useless an hour later. 10 minutes.
export const PUSH_TTL_SECONDS = 10 * 60;

// Give up on a push service that doesn't answer within 5 seconds (the older person's
// request waits for the alerts).
const PUSH_TIMEOUT_MS = 5_000;

// The status codes that mean "this subscription is dead, delete it".
const GONE_STATUS_CODES = [404, 410];

// The real sender, through the web-push library.
export function createWebPushSender(config: VapidConfig): PushSender {
  return async (target, message) => {
    try {
      await webpush.sendNotification(target, JSON.stringify(message), {
        TTL: PUSH_TTL_SECONDS,
        urgency: "high", // wake the phone even in battery-saving mode
        timeout: PUSH_TIMEOUT_MS,
        vapidDetails: {
          subject: config.subject,
          publicKey: config.publicKey,
          privateKey: config.privateKey,
        },
      });
      return "sent";
    } catch (error) {
      // WebPushError = the push service answered with an error status.
      // `instanceof` is like Python's isinstance().
      if (error instanceof webpush.WebPushError) {
        if (GONE_STATUS_CODES.includes(error.statusCode)) {
          return "gone";
        }
        // Only the status code: the answer body could echo the endpoint.
        throw new Error(`push service answered HTTP ${error.statusCode}`);
      }
      throw error;
    }
  };
}
