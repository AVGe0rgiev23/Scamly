// /api/push/subscriptions (BUILD_PLAN 3, #23 and #24, task W2-05)
//   POST   { endpoint, keys: { p256dh, auth } } -> 201 { ok: true }
//          "send push notifications to this browser": stores the browser's push
//          subscription for the caller (any logged-in account). 409 when the endpoint
//          belongs to another account (src/lib/push.ts then re-subscribes once).
//   DELETE { endpoint } -> 200 { ok: true, removed }
//          "stop": deletes the caller's OWN row for this endpoint (never someone else's).
// Both: same-origin only, 429 after 20 changes per account per hour.

import { PushSubscriptionSchema, PushUnsubscribeSchema } from "@/schemas/push";
import { requireRole } from "@/server/auth/requireRole";
import { handleApiError, json } from "@/server/http/errors";
import { readJsonBody } from "@/server/http/request";
import { assertSameOrigin } from "@/server/security/origin";
import {
  createPushSubscriptionDeps,
  removeSubscription,
  saveSubscription,
} from "@/server/services/pushSubscriptionService";
import { createAdminClient } from "@/server/supabase/adminClient";
import { createUserClient } from "@/server/supabase/userClient";

// Every logged-in role may switch notifications on for itself.
const ANY_ROLE = ["family", "protected", "moderator", "admin"] as const;

export async function POST(request: Request) {
  try {
    assertSameOrigin(request); // 0. from our own site? (CSRF)
    const client = await createUserClient();
    const actor = await requireRole([...ANY_ROLE], client); // 1. who are you? (401)
    const input = PushSubscriptionSchema.parse(await readJsonBody(request)); // 2. valid? (400)
    const deps = createPushSubscriptionDeps(client, createAdminClient());
    const result = await saveSubscription(deps, actor, input); // 3. rate limit + store (RLS)
    return json(result, 201); // 4. respond
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(request: Request) {
  try {
    assertSameOrigin(request); // 0. from our own site? (CSRF)
    const client = await createUserClient();
    const actor = await requireRole([...ANY_ROLE], client); // 1. who are you? (401)
    const input = PushUnsubscribeSchema.parse(await readJsonBody(request)); // 2. valid? (400)
    const deps = createPushSubscriptionDeps(client, createAdminClient());
    const result = await removeSubscription(deps, actor, input); // 3. delete own row (RLS)
    return json(result); // 4. respond
  } catch (error) {
    return handleApiError(error);
  }
}
