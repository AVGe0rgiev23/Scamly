// Database queries for the push_subscriptions table: one row per browser / phone that
// agreed to receive web push notifications (task W2-05).
//
// Two kinds of callers:
//   * the API (POST/DELETE /api/push/subscriptions) uses the USER client, so RLS lets
//     a person add and delete only their OWN rows (user_id = auth.uid());
//   * the push channel (alerts) uses the ADMIN client (BUILD_PLAN 2.4, use 4): it reads
//     the subscriptions of OTHER users (the family members it alerts) and deletes the
//     ones the push service says are gone.
// There is no UPDATE right on this table: a changed subscription is deleted and
// added again.

import type { DbClient } from "@/server/supabase/userClient";

// PostgreSQL's error code for "this value must be unique and already exists".
const UNIQUE_VIOLATION = "23505";

// One stored subscription, as the push sender needs it.
export type StoredPushSubscription = {
  id: string;
  user_id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
};

// Deletes the caller's own row for this endpoint (if any). Returns how many rows went
// (0 or 1). User client: RLS hides other people's rows, and we filter on user_id too.
export async function deleteOwnPushSubscription(
  client: DbClient,
  userId: string,
  endpoint: string,
): Promise<number> {
  const { data, error } = await client
    .from("push_subscriptions")
    .delete()
    .eq("user_id", userId)
    .eq("endpoint", endpoint)
    .select("id");
  if (error) {
    throw new Error(`deleteOwnPushSubscription failed: ${error.message}`);
  }
  return data.length;
}

// Adds a row for the caller (user client; RLS checks user_id = auth.uid()).
// "endpoint_taken" = the endpoint is already stored for ANOTHER account (the same
// browser was used by someone else before), which RLS doesn't let us see or delete.
export async function insertOwnPushSubscription(
  client: DbClient,
  row: { userId: string; endpoint: string; p256dh: string; auth: string },
): Promise<"inserted" | "endpoint_taken"> {
  const { error } = await client.from("push_subscriptions").insert({
    user_id: row.userId,
    endpoint: row.endpoint,
    p256dh: row.p256dh,
    auth: row.auth,
  });
  if (error) {
    if (error.code === UNIQUE_VIOLATION) {
      return "endpoint_taken";
    }
    throw new Error(`insertOwnPushSubscription failed: ${error.message}`);
  }
  return "inserted";
}

// Every subscription of one user (admin client: the push channel alerts OTHER users).
export async function listPushSubscriptionsOfUser(
  admin: DbClient,
  userId: string,
): Promise<StoredPushSubscription[]> {
  const { data, error } = await admin
    .from("push_subscriptions")
    .select("id, user_id, endpoint, p256dh, auth")
    .eq("user_id", userId)
    .order("created_at", { ascending: true });
  if (error) {
    throw new Error(`listPushSubscriptionsOfUser failed: ${error.message}`);
  }
  return data;
}

// Removes a subscription the push service called "gone" (HTTP 404 / 410): the browser
// was uninstalled, the permission was taken back, or the subscription expired.
export async function deletePushSubscriptionById(admin: DbClient, id: string): Promise<void> {
  const { error } = await admin.from("push_subscriptions").delete().eq("id", id);
  if (error) {
    throw new Error(`deletePushSubscriptionById failed: ${error.message}`);
  }
}
