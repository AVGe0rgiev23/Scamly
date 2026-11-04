// Input rules (Zod schemas) and answer shapes for web push (task W2-05,
// BUILD_PLAN 3 #23–#24):
//
//   PushSubscriptionSchema   POST   /api/push/subscriptions  (save this browser)
//   PushUnsubscribeSchema    DELETE /api/push/subscriptions  (forget this browser)
//   PushPublicKeyDto         GET    /api/push/public-key     (what the browser needs)
//
// No server-only code here, so the browser helper (src/lib/push.ts) can use the same
// types. A Zod schema is like a Pydantic model in Python.

import { z } from "zod";
import { bg } from "@/i18n/bg";

// The push services of the browsers we support. A subscription's endpoint is a URL
// on one of them; our server POSTs the notification there. We accept no other host,
// so nobody can make our server send requests to some other address (SSRF).
//   fcm.googleapis.com         Chrome, Samsung Internet, Opera, Brave (Android + desktop)
//   push.services.mozilla.com  Firefox
//   push.apple.com             Safari on iPhone (after "Add to Home Screen") and Mac
//   notify.windows.com         Microsoft Edge
export const PUSH_SERVICE_HOSTS = [
  "fcm.googleapis.com",
  "push.services.mozilla.com",
  "push.apple.com",
  "notify.windows.com",
];

// The database allows endpoints of up to 1000 characters.
export const MAX_ENDPOINT_LENGTH = 1000;

// True for an https:// URL on one of the push services above (the host itself or a
// sub-domain of it, e.g. web.push.apple.com, wns2-db5p.notify.windows.com).
export function isAllowedPushEndpoint(endpoint: string): boolean {
  let url: URL;
  try {
    url = new URL(endpoint);
  } catch {
    return false;
  }
  if (url.protocol !== "https:" || url.username !== "" || url.password !== "") {
    return false;
  }
  if (url.port !== "" && url.port !== "443") {
    return false;
  }
  const host = url.hostname.toLowerCase();
  return PUSH_SERVICE_HOSTS.some((allowed) => host === allowed || host.endsWith("." + allowed));
}

const endpoint = z
  .string({ error: bg.push.subscriptionInvalid })
  .max(MAX_ENDPOINT_LENGTH, { error: bg.push.subscriptionInvalid })
  .refine(isAllowedPushEndpoint, { error: bg.push.subscriptionInvalid });

// The browser's keys are base64url text (letters, digits, "-" and "_", maybe "=" at
// the end). p256dh is a public key (87 characters), auth a secret (22 characters);
// the limits below leave some room but stop huge values.
function base64UrlKey(minLength: number, maxLength: number) {
  return z
    .string({ error: bg.push.subscriptionInvalid })
    .min(minLength, { error: bg.push.subscriptionInvalid })
    .max(maxLength, { error: bg.push.subscriptionInvalid })
    .regex(/^[A-Za-z0-9_-]+={0,2}$/, { error: bg.push.subscriptionInvalid });
}

// What the browser sends: exactly what PushSubscription.toJSON() gives
// ({ endpoint, expirationTime, keys: { p256dh, auth } }). Unknown keys such as
// expirationTime are dropped by Zod.
export const PushSubscriptionSchema = z.object({
  endpoint,
  keys: z.object(
    {
      p256dh: base64UrlKey(43, 200),
      auth: base64UrlKey(16, 100),
    },
    { error: bg.push.subscriptionInvalid },
  ),
});

// `z.infer` gets the TypeScript type from the schema (like a Pydantic model's fields).
export type PushSubscriptionInput = z.infer<typeof PushSubscriptionSchema>;

// DELETE only needs the endpoint (it identifies the browser).
export const PushUnsubscribeSchema = z.object({ endpoint });

export type PushUnsubscribeInput = z.infer<typeof PushUnsubscribeSchema>;

// GET /api/push/public-key. enabled = false when push is switched off (FEATURE_PUSH)
// or the server has no VAPID keys; then the opt-in button should not be shown.
export type PushPublicKeyDto = {
  enabled: boolean;
  publicKey: string | null;
};
