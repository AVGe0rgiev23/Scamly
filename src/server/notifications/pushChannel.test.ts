// Unit tests for the web push alert channel (pushChannel.ts, task W2-05), with fakes
// instead of Supabase and the push services.

import { afterEach, describe, expect, it, vi } from "vitest";
import { getFeatures } from "@/config/features";
import { bg } from "@/i18n/bg";
import { getServerEnv } from "@/lib/env";
import {
  alertPagePath,
  buildPushMessage,
  createPushChannel,
  createRealPushChannel,
  getPushConfig,
  type PushChannelDeps,
} from "@/server/notifications/pushChannel";
import type { PushMessage, PushSendResult, PushTarget } from "@/server/notifications/pushSender";
import type { NewAlert } from "@/server/repositories/alertsRepository";
import type { StoredPushSubscription } from "@/server/repositories/pushSubscriptionsRepository";
import {
  fanOut,
  notifyVerdict,
  realtimeChannel,
  type AlertDeps,
  type AlertPayload,
  type ContactRef,
} from "@/server/services/alertService";
import type { DbClient } from "@/server/supabase/userClient";

const CHECK = "0b9e5f8a-1111-4222-8333-944445555666";
const PERSON = "person-elena";
const NOW = new Date("2026-11-09T10:00:00Z");

// Valid-looking fake settings (never real keys in tests).
const BASE_ENV = {
  NEXT_PUBLIC_SUPABASE_URL: "http://127.0.0.1:54321",
  NEXT_PUBLIC_SUPABASE_ANON_KEY: "fake-anon-key",
  SUPABASE_SERVICE_ROLE_KEY: "fake-service-role-key",
  PAIRING_PEPPER: "a".repeat(32),
  HASH_PEPPER: "b".repeat(32),
};
const KEYS_ENV = { VAPID_PUBLIC_KEY: "B".repeat(87), VAPID_PRIVATE_KEY: "p".repeat(43) };

function payload(fields: Partial<AlertPayload> = {}): AlertPayload {
  return {
    kind: "started",
    checkId: CHECK,
    protectedPersonId: PERSON,
    personName: "Елена Петрова",
    riskLevel: null,
    ...fields, // `...` copies the fields in, like {**defaults, **fields} in Python
  };
}

function subscription(id: string, userId: string): StoredPushSubscription {
  return {
    id,
    user_id: userId,
    endpoint: `https://fcm.googleapis.com/fcm/send/${id}`,
    p256dh: "key-" + id,
    auth: "auth-" + id,
  };
}

// A fake push world: subscriptions per user, and what the fake push service answers
// per subscription id ("sent", "gone", or "error" = it throws).
function fakePush(
  subscriptions: StoredPushSubscription[],
  answers: Record<string, PushSendResult | "error"> = {},
) {
  const table = [...subscriptions];
  const sent: { target: PushTarget; message: PushMessage }[] = [];
  const listedFor: string[] = [];
  const deps: PushChannelDeps = {
    send: async (target, message) => {
      const sub = table.find((s) => s.endpoint === target.endpoint);
      const answer = (sub && answers[sub.id]) ?? "sent";
      if (answer === "error") {
        throw new Error("push service answered HTTP 500");
      }
      if (answer === "sent") {
        sent.push({ target, message });
      }
      return answer;
    },
    listSubscriptions: async (userId) => {
      listedFor.push(userId);
      return table.filter((s) => s.user_id === userId);
    },
    deleteSubscription: async (id) => {
      const index = table.findIndex((s) => s.id === id);
      if (index >= 0) {
        table.splice(index, 1);
      }
    },
  };
  return { deps, table, sent, listedFor };
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("getPushConfig (when is push on?)", () => {
  it("is on with FEATURE_PUSH (default on) and both keys, with the default subject", () => {
    const env = getServerEnv({ ...BASE_ENV, ...KEYS_ENV });
    expect(getPushConfig(env, getFeatures({}))).toEqual({
      publicKey: KEYS_ENV.VAPID_PUBLIC_KEY,
      privateKey: KEYS_ENV.VAPID_PRIVATE_KEY,
      subject: "mailto:scamly-demo@example.invalid",
    });
  });

  it("uses VAPID_SUBJECT when it is set", () => {
    const env = getServerEnv({
      ...BASE_ENV,
      ...KEYS_ENV,
      VAPID_SUBJECT: "mailto:team@example.org",
    });
    expect(getPushConfig(env, getFeatures({}))?.subject).toBe("mailto:team@example.org");
  });

  it("is off when FEATURE_PUSH is off", () => {
    const env = getServerEnv({ ...BASE_ENV, ...KEYS_ENV });
    expect(getPushConfig(env, getFeatures({ FEATURE_PUSH: "false" }))).toBeNull();
  });

  it("is off when a key is missing or empty", () => {
    const features = getFeatures({});
    expect(getPushConfig(getServerEnv(BASE_ENV), features)).toBeNull();
    const noPrivate = getServerEnv({ ...BASE_ENV, ...KEYS_ENV, VAPID_PRIVATE_KEY: "" });
    expect(getPushConfig(noPrivate, features)).toBeNull();
  });

  it("is off (with a warning naming no value) when a key is malformed", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const env = getServerEnv({ ...BASE_ENV, ...KEYS_ENV, VAPID_PRIVATE_KEY: "too-short" });
    expect(getPushConfig(env, getFeatures({}))).toBeNull();
    expect(String(warn.mock.calls[0])).not.toContain("too-short");
  });

  it("createRealPushChannel gives no channel at all when push is off", () => {
    const admin = {} as DbClient; // never used when push is off
    const env = getServerEnv({ ...BASE_ENV, ...KEYS_ENV });
    expect(createRealPushChannel(admin, env, getFeatures({ FEATURE_PUSH: "0" }))).toBeNull();
    expect(createRealPushChannel(admin, getServerEnv(BASE_ENV), getFeatures({}))).toBeNull();
    expect(createRealPushChannel(admin, env, getFeatures({}))?.name).toBe("push");
  });
});

describe("buildPushMessage", () => {
  it("says who, links to the alert page of this check and tags it with the check id", () => {
    expect(buildPushMessage(payload())).toEqual({
      title: "Елена Петрова: съмнително обаждане",
      body: bg.push.startedBody,
      url: `/family/alerts?check=${CHECK}`,
      tag: `check-${CHECK}`,
    });
  });

  it("sends a second message only for a red verdict", () => {
    expect(buildPushMessage(payload({ kind: "verdict", riskLevel: "red" }))).toEqual({
      title: "Внимание! Елена Петрова: признаци на измама",
      body: bg.push.redBody,
      url: alertPagePath(CHECK),
      tag: `check-${CHECK}`,
    });
    expect(buildPushMessage(payload({ kind: "verdict", riskLevel: "yellow" }))).toBeNull();
    expect(buildPushMessage(payload({ kind: "verdict", riskLevel: "green" }))).toBeNull();
    expect(buildPushMessage(payload({ kind: "verdict", riskLevel: null }))).toBeNull();
  });

  it("uses „Ваш близък“ when the name is unknown", () => {
    expect(buildPushMessage(payload({ personName: "  " }))?.title).toBe(
      "Ваш близък: съмнително обаждане",
    );
  });

  it("contains no free text: only the four fields, fixed bg.ts texts, the name and the id", () => {
    for (const p of [payload(), payload({ kind: "verdict", riskLevel: "red" })]) {
      const message = buildPushMessage(p);
      expect(Object.keys(message ?? {}).sort()).toEqual(["body", "tag", "title", "url"]);
      // Every text is a bg.push template with only {name} filled in.
      const templates: string[] = [bg.push.startedTitle, bg.push.redTitle];
      expect(templates.map((t) => t.replace("{name}", p.personName))).toContain(message?.title);
      expect([bg.push.startedBody, bg.push.redBody]).toContain(message?.body);
      // No digits except those of the check id (so no phone numbers).
      const withoutId = JSON.stringify(message).replaceAll(CHECK, "");
      expect(withoutId).not.toMatch(/[0-9]/);
    }
  });
});

describe("createPushChannel", () => {
  const anna = { userId: "anna", displayName: "Анна" };

  it("sends the message to EVERY subscription of the recipient, and to nobody else", async () => {
    const world = fakePush([
      subscription("anna-phone", "anna"),
      subscription("anna-laptop", "anna"),
      subscription("ivan-phone", "ivan"),
    ]);

    await createPushChannel(world.deps).send(anna, payload());

    expect(world.sent.map((s) => s.target.endpoint)).toEqual([
      "https://fcm.googleapis.com/fcm/send/anna-phone",
      "https://fcm.googleapis.com/fcm/send/anna-laptop",
    ]);
    expect(world.sent[0]?.target.keys).toEqual({
      p256dh: "key-anna-phone",
      auth: "auth-anna-phone",
    });
  });

  it("deletes subscriptions the push service calls gone (404/410) and still counts as sent", async () => {
    const world = fakePush([subscription("old", "anna"), subscription("new", "anna")], {
      old: "gone",
    });

    const result = await createPushChannel(world.deps).send(anna, payload());

    expect(result).toBeUndefined(); // "sent"
    expect(world.table.map((s) => s.id)).toEqual(["new"]);
  });

  it("throws (→ a 'failed' row) when every subscription was gone, after removing them", async () => {
    const world = fakePush([subscription("old", "anna")], { old: "gone" });

    await expect(createPushChannel(world.deps).send(anna, payload())).rejects.toThrow(/expired/);
    expect(world.table).toEqual([]);
  });

  it("throws (→ a 'failed' row) when no browser could be reached, without the endpoint", async () => {
    const world = fakePush([subscription("broken", "anna")], { broken: "error" });

    const error = await createPushChannel(world.deps)
      .send(anna, payload())
      .catch((e: unknown) => e);

    expect(error).toBeInstanceOf(Error);
    expect(String(error)).toMatch(/HTTP 500/);
    expect(String(error)).not.toContain("fcm.googleapis.com");
    expect(world.table).toHaveLength(1); // a 500 is not "gone": keep it
  });

  it("answers 'skipped' when the recipient has no subscription, or the verdict is not red", async () => {
    const world = fakePush([subscription("ivan-phone", "ivan")]);
    const channel = createPushChannel(world.deps);

    expect(await channel.send(anna, payload())).toBe("skipped");
    expect(await channel.send(anna, payload({ kind: "verdict", riskLevel: "yellow" }))).toBe(
      "skipped",
    );
    expect(world.sent).toEqual([]);
  });

  it("logs, but doesn't fail, when deleting a dead subscription fails", async () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    const world = fakePush([subscription("old", "anna"), subscription("ok", "anna")], {
      old: "gone",
    });
    world.deps.deleteSubscription = async () => {
      throw new Error("database is down");
    };

    await expect(createPushChannel(world.deps).send(anna, payload())).resolves.toBeUndefined();
    expect(error).toHaveBeenCalledOnce();
  });
});

describe("push inside the alert fan-out (alertService)", () => {
  // Елена's contacts: two with a Scamly account, one phone-only neighbour.
  const CONTACTS: ContactRef[] = [
    { user_id: "anna", display_name: "Анна", phone: null, priority: 1 },
    { user_id: "ivan", display_name: "Иван", phone: "0888 111 222", priority: 2 },
    { user_id: null, display_name: "Пенка", phone: "0899 333 444", priority: 3 },
  ];

  function alertDeps(world: ReturnType<typeof fakePush>, riskLevel: "red" | null = null) {
    const inserted: NewAlert[] = [];
    const deps: AlertDeps = {
      now: () => NOW,
      findCheck: async () => ({ protected_person_id: PERSON, risk_level: riskLevel }),
      findPersonName: async () => "Елена Петрова",
      listContacts: async () => CONTACTS,
      listAlertedRecipients: async () => [],
      insertAlerts: async (alerts) => {
        inserted.push(...alerts);
      },
      channels: [realtimeChannel, createPushChannel(world.deps)],
    };
    return { deps, inserted };
  }

  it("pushes only to linked contacts, records sent/failed per member, never breaks the fan-out", async () => {
    const world = fakePush(
      [subscription("anna-phone", "anna"), subscription("ivan-phone", "ivan")],
      { "ivan-phone": "error" },
    );
    const { deps, inserted } = alertDeps(world);

    const created = await fanOut(deps, CHECK);

    // Only contacts with an account were looked up (never the phone-only neighbour).
    expect(world.listedFor.sort()).toEqual(["anna", "ivan"]);
    const pushRows = inserted.filter((row) => row.channel === "push");
    expect(pushRows).toEqual([
      {
        checkId: CHECK,
        recipientId: "anna",
        channel: "push",
        status: "sent",
        error: null,
        sentAt: NOW,
      },
      expect.objectContaining({ recipientId: "ivan", status: "failed", sentAt: null }),
    ]);
    // The realtime rows are still there for both: one failing push breaks nothing.
    expect(inserted.filter((row) => row.channel === "realtime")).toHaveLength(2);
    expect(created).toBe(4);
  });

  it("writes no push row for a member without a subscription", async () => {
    const world = fakePush([subscription("anna-phone", "anna")]);
    const { deps, inserted } = alertDeps(world);

    await fanOut(deps, CHECK);

    expect(inserted.filter((row) => row.channel === "push").map((row) => row.recipientId)).toEqual([
      "anna",
    ]);
  });

  it("sends the red follow-up on the verdict", async () => {
    const world = fakePush([subscription("anna-phone", "anna")]);
    const { deps } = alertDeps(world, "red");

    await notifyVerdict(deps, CHECK);

    expect(world.sent.map((s) => s.message.title)).toEqual([
      "Внимание! Елена Петрова: признаци на измама",
    ]);
  });
});
