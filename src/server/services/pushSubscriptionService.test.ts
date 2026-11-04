// Unit tests for switching web push on and off (pushSubscriptionService.ts, W2-05),
// with an in-memory table instead of Supabase. The fake table behaves like the real
// one: unique endpoints, and RLS-like "own rows only" for delete.

import { describe, expect, it } from "vitest";
import { ApiError } from "@/server/http/errors";
import {
  removeSubscription,
  saveSubscription,
  type PushSubscriptionDeps,
} from "@/server/services/pushSubscriptionService";
import { familyActor } from "@/server/services/__tests__/familyWorld";

const ENDPOINT = "https://fcm.googleapis.com/fcm/send/anna-phone";
const KEYS = { p256dh: "B" + "x".repeat(86), auth: "a1B2c3D4e5F6g7H8i9J0kL" };

type Row = { user_id: string; endpoint: string; p256dh: string; auth: string };

function fakeDeps(options: { allowed?: boolean; rows?: Row[] } = {}) {
  const rows: Row[] = options.rows ?? [];
  const rateKeys: string[] = [];
  const deps: PushSubscriptionDeps = {
    hitCounter: async (key) => {
      rateKeys.push(key);
      return options.allowed ?? true;
    },
    // Like RLS + our .eq("user_id"): only the caller's own rows can be deleted.
    deleteOwn: async (userId, endpoint) => {
      const index = rows.findIndex((r) => r.user_id === userId && r.endpoint === endpoint);
      if (index < 0) {
        return 0;
      }
      rows.splice(index, 1); // like `del rows[index]` in Python
      return 1;
    },
    // Like the UNIQUE constraint on endpoint.
    insertOwn: async (row) => {
      if (rows.some((existing) => existing.endpoint === row.endpoint)) {
        return "endpoint_taken";
      }
      rows.push({
        user_id: row.userId,
        endpoint: row.endpoint,
        p256dh: row.p256dh,
        auth: row.auth,
      });
      return "inserted";
    },
  };
  return { deps, rows, rateKeys };
}

describe("saveSubscription (POST /api/push/subscriptions)", () => {
  it("stores the subscription for the CALLER, counted by the per-user rate limit", async () => {
    const { deps, rows, rateKeys } = fakeDeps();

    const result = await saveSubscription(deps, familyActor("anna"), {
      endpoint: ENDPOINT,
      keys: KEYS,
    });

    expect(result).toEqual({ ok: true });
    expect(rows).toEqual([{ user_id: "anna", endpoint: ENDPOINT, ...KEYS }]);
    expect(rateKeys).toEqual(["push:user:anna"]);
  });

  it("refreshes the keys of the caller's own endpoint instead of failing (upsert)", async () => {
    const { deps, rows } = fakeDeps({
      rows: [{ user_id: "anna", endpoint: ENDPOINT, p256dh: "old", auth: "old" }],
    });

    await saveSubscription(deps, familyActor("anna"), { endpoint: ENDPOINT, keys: KEYS });

    expect(rows).toEqual([{ user_id: "anna", endpoint: ENDPOINT, ...KEYS }]);
  });

  it("answers 409 and leaves the other account's row alone when the endpoint is taken", async () => {
    const ivanRow = { user_id: "ivan", endpoint: ENDPOINT, p256dh: "k", auth: "a" };
    const { deps, rows } = fakeDeps({ rows: [ivanRow] });

    const error = await saveSubscription(deps, familyActor("anna"), {
      endpoint: ENDPOINT,
      keys: KEYS,
    }).catch((e: unknown) => e);

    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({ status: 409, code: "push_endpoint_taken" });
    expect(rows).toEqual([ivanRow]);
  });

  it("answers 429 and stores nothing when the rate limit is reached", async () => {
    const { deps, rows } = fakeDeps({ allowed: false });

    await expect(
      saveSubscription(deps, familyActor("anna"), { endpoint: ENDPOINT, keys: KEYS }),
    ).rejects.toMatchObject({ status: 429 });
    expect(rows).toEqual([]);
  });
});

describe("removeSubscription (DELETE /api/push/subscriptions)", () => {
  it("deletes the caller's own row", async () => {
    const { deps, rows } = fakeDeps({
      rows: [{ user_id: "anna", endpoint: ENDPOINT, ...KEYS }],
    });

    const result = await removeSubscription(deps, familyActor("anna"), { endpoint: ENDPOINT });

    expect(result).toEqual({ ok: true, removed: true });
    expect(rows).toEqual([]);
  });

  it("can't delete someone else's subscription (own only), and still answers 200", async () => {
    const ivanRow = { user_id: "ivan", endpoint: ENDPOINT, ...KEYS };
    const { deps, rows } = fakeDeps({ rows: [ivanRow] });

    const result = await removeSubscription(deps, familyActor("anna"), { endpoint: ENDPOINT });

    expect(result).toEqual({ ok: true, removed: false });
    expect(rows).toEqual([ivanRow]);
  });

  it("answers 429 when the rate limit is reached", async () => {
    const { deps } = fakeDeps({ allowed: false });
    await expect(
      removeSubscription(deps, familyActor("anna"), { endpoint: ENDPOINT }),
    ).rejects.toMatchObject({ status: 429 });
  });
});
