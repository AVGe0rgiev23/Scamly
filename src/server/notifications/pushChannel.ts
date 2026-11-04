// The web push alert channel (W2-05, decision D7): an AlertChannel for alertService.ts.
//
// Who gets a push: a family member with a Scamly account in the person's contact list
// (alertService already keeps only those) who switched notifications on in at least
// one browser (a row in push_subscriptions). Every browser / phone of that person gets
// the message.
//
// When:
//   kind "started"  „Елена Петрова: съмнително обаждане“, right when the button is pressed
//   kind "verdict"  a second, short push ONLY when the verdict is red; otherwise nothing
//
// send() returns "skipped" when there is nothing to send (no subscription, or a verdict
// that is not red): then the alert service writes no alerts row. It throws when no
// browser could be reached: the alert service writes a "failed" row and goes on.
// A subscription the push service calls gone (HTTP 404 / 410) is deleted on the spot.
//
// The channel is only switched on when FEATURE_PUSH is on AND both VAPID keys are set
// (getPushConfig below); otherwise alertService doesn't even add it to its list.
//
// The service role is used to read the subscriptions (BUILD_PLAN 2.4 use 4): they
// belong to OTHER users (the family members), which RLS doesn't let anyone else read.

import "server-only";
import { getFeatures, type Features } from "@/config/features";
import { ROUTES } from "@/config/routes";
import { bg } from "@/i18n/bg";
import { getServerEnv, type ServerEnv } from "@/lib/env";
import {
  createWebPushSender,
  type PushMessage,
  type PushSender,
  type VapidConfig,
} from "@/server/notifications/pushSender";
import {
  deletePushSubscriptionById,
  listPushSubscriptionsOfUser,
  type StoredPushSubscription,
} from "@/server/repositories/pushSubscriptionsRepository";
import type { AlertChannel, AlertPayload } from "@/server/services/alertService";
import type { DbClient } from "@/server/supabase/userClient";

// What `npx web-push generate-vapid-keys` prints: base64url text of 65 bytes (public
// key, 87 characters) and 32 bytes (private key, 43 characters).
const VAPID_PUBLIC_KEY_FORMAT = /^[A-Za-z0-9_-]{87}$/;
const VAPID_PRIVATE_KEY_FORMAT = /^[A-Za-z0-9_-]{43}$/;

// The push settings, or null when push is off: FEATURE_PUSH is off, or a VAPID key
// is missing or malformed. Also used by GET /api/push/public-key.
export function getPushConfig(env: ServerEnv, features: Features): VapidConfig | null {
  if (!features.push) {
    return null;
  }
  if (env.VAPID_PUBLIC_KEY === undefined || env.VAPID_PRIVATE_KEY === undefined) {
    return null;
  }
  if (
    !VAPID_PUBLIC_KEY_FORMAT.test(env.VAPID_PUBLIC_KEY) ||
    !VAPID_PRIVATE_KEY_FORMAT.test(env.VAPID_PRIVATE_KEY)
  ) {
    // Names only, never the values. A broken key must not take alerts down.
    console.warn("[push] VAPID_PUBLIC_KEY or VAPID_PRIVATE_KEY is malformed: push is off");
    return null;
  }
  return {
    publicKey: env.VAPID_PUBLIC_KEY,
    privateKey: env.VAPID_PRIVATE_KEY,
    subject: env.VAPID_SUBJECT,
  };
}

// The page the notification opens: the family's alert page for this check.
export function alertPagePath(checkId: string): string {
  return `${ROUTES.family}/alerts?check=${encodeURIComponent(checkId)}`;
}

// Puts the person's name into a text from bg.ts.
function withName(template: string, name: string): string {
  return template.replaceAll("{name}", name);
}

// The notification for one alert, or null when there is nothing to send (a verdict
// that is not red). Only fixed texts from bg.ts, the person's name and the check id:
// never the call's text, the answers or a phone number.
export function buildPushMessage(payload: AlertPayload): PushMessage | null {
  const name = payload.personName.trim() === "" ? bg.push.someone : payload.personName.trim();
  const url = alertPagePath(payload.checkId);
  const tag = `check-${payload.checkId}`;

  if (payload.kind === "started") {
    return { title: withName(bg.push.startedTitle, name), body: bg.push.startedBody, url, tag };
  }
  if (payload.riskLevel === "red") {
    return { title: withName(bg.push.redTitle, name), body: bg.push.redBody, url, tag };
  }
  return null;
}

// Everything the push channel needs from the outside world (tests pass fakes).
export type PushChannelDeps = {
  send: PushSender;
  listSubscriptions: (userId: string) => Promise<StoredPushSubscription[]>;
  deleteSubscription: (subscriptionId: string) => Promise<void>;
};

// A short, safe description of a problem (no stack trace, no endpoint).
function describeError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export function createPushChannel(deps: PushChannelDeps): AlertChannel {
  return {
    name: "push",
    send: async (recipient, payload) => {
      const message = buildPushMessage(payload);
      if (message === null) {
        return "skipped";
      }
      const subscriptions = await deps.listSubscriptions(recipient.userId);
      if (subscriptions.length === 0) {
        return "skipped"; // this family member never switched notifications on
      }

      // Try every browser of this person, one after the other.
      let sentCount = 0;
      let goneCount = 0;
      const problems: string[] = [];
      for (const subscription of subscriptions) {
        try {
          const result = await deps.send(
            {
              endpoint: subscription.endpoint,
              keys: { p256dh: subscription.p256dh, auth: subscription.auth },
            },
            message,
          );
          if (result === "sent") {
            sentCount += 1;
          } else {
            goneCount += 1;
            await deleteQuietly(deps, subscription.id);
          }
        } catch (error) {
          problems.push(describeError(error));
        }
      }

      // At least one browser got it: the alert counts as "sent".
      if (sentCount > 0) {
        return;
      }
      // Nobody got it: throw, so the alert service writes a "failed" row.
      if (problems.length === 0) {
        throw new Error(`all ${goneCount} push subscription(s) expired and were removed`);
      }
      throw new Error(`push failed for ${problems.length} subscription(s): ${problems[0]}`);
    },
  };
}

// Deleting a dead subscription is housekeeping: if it fails, we only log it (the next
// alert will try again) and never let it break the alert.
async function deleteQuietly(deps: PushChannelDeps, subscriptionId: string): Promise<void> {
  try {
    await deps.deleteSubscription(subscriptionId);
  } catch (error) {
    console.error("[push] could not delete a dead subscription:", describeError(error));
  }
}

// The real push channel, or null when push is off (see getPushConfig). Subscriptions
// are read and cleaned up through the admin client (service role, use 4).
export function createRealPushChannel(
  admin: DbClient,
  env: ServerEnv = getServerEnv(),
  features: Features = getFeatures(),
): AlertChannel | null {
  const config = getPushConfig(env, features);
  if (config === null) {
    return null;
  }
  return createPushChannel({
    send: createWebPushSender(config),
    listSubscriptions: (userId) => listPushSubscriptionsOfUser(admin, userId),
    deleteSubscription: (subscriptionId) => deletePushSubscriptionById(admin, subscriptionId),
  });
}
