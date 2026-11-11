// Unit tests for the family alert fan-out (alertService.ts, task W2-03), with fakes
// instead of Supabase.

import { afterEach, describe, expect, it, vi } from "vitest";
import type { NewAlert } from "@/server/repositories/alertsRepository";
import {
  fanOut,
  notifyVerdict,
  realtimeChannel,
  recipientsFrom,
  type AlertChannel,
  type AlertDeps,
  type AlertPayload,
  type AlertRecipient,
  type ContactRef,
} from "@/server/services/alertService";

const CHECK = "check-1";
const PERSON = "person-maria";
const NOW = new Date("2026-11-09T10:00:00Z");

// Мария's contacts: two with a Scamly account, one phone-only neighbour.
const CONTACTS: ContactRef[] = [
  { user_id: "owner-anna", display_name: "Анна", phone: null, priority: 1 },
  { user_id: "contact-ivan", display_name: "Иван", phone: "0888 111 222", priority: 2 },
  { user_id: null, display_name: "Пенка", phone: "0899 333 444", priority: 3 },
];

function fakeDeps(channels: AlertChannel[], checkExists: boolean = true) {
  const inserted: NewAlert[] = [];
  let insertCalls = 0;
  const deps: AlertDeps = {
    now: () => NOW,
    findCheck: async (checkId) =>
      checkExists && checkId === CHECK ? { protected_person_id: PERSON, risk_level: null } : null,
    findPersonName: async () => "Мария Петрова",
    listContacts: async () => CONTACTS,
    listAlertedRecipients: async () => [],
    insertAlerts: async (alerts) => {
      inserted.push(...alerts); // `...` spreads the list, like list.extend() in Python
      insertCalls += 1;
    },
    channels,
  };
  return { deps, inserted, insertCalls: () => insertCalls };
}

// A channel that remembers what it was asked to send (and can be made to fail).
function recordingChannel(name: AlertChannel["name"], failFor: string | null = null) {
  const sent: { recipient: AlertRecipient; payload: AlertPayload }[] = [];
  const channel: AlertChannel = {
    name,
    send: async (recipient, payload) => {
      if (recipient.userId === failFor) {
        throw new Error("subscription expired");
      }
      sent.push({ recipient, payload });
    },
  };
  return { channel, sent };
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("recipientsFrom", () => {
  it("keeps only contacts with a Scamly account", () => {
    expect(recipientsFrom(CONTACTS)).toEqual([
      { userId: "owner-anna", displayName: "Анна" },
      { userId: "contact-ivan", displayName: "Иван" },
    ]);
  });
});

describe("fanOut", () => {
  it("writes one 'sent' realtime alert per contact with an account, none for the others", async () => {
    const { deps, inserted, insertCalls } = fakeDeps([realtimeChannel]);

    const created = await fanOut(deps, CHECK);

    expect(created).toBe(2);
    expect(insertCalls()).toBe(1); // one INSERT for all rows
    expect(inserted).toEqual([
      {
        checkId: CHECK,
        recipientId: "owner-anna",
        channel: "realtime",
        status: "sent",
        error: null,
        sentAt: NOW,
      },
      {
        checkId: CHECK,
        recipientId: "contact-ivan",
        channel: "realtime",
        status: "sent",
        error: null,
        sentAt: NOW,
      },
    ]);
  });

  it("gives every channel the same payload (ready for push and e-mail)", async () => {
    const push = recordingChannel("push");
    const { deps, inserted } = fakeDeps([realtimeChannel, push.channel]);

    await fanOut(deps, CHECK);

    expect(inserted).toHaveLength(4); // 2 contacts × 2 channels
    expect(push.sent.map((s) => s.recipient.displayName)).toEqual(["Анна", "Иван"]);
    expect(push.sent[0]?.payload).toEqual({
      kind: "started",
      checkId: CHECK,
      protectedPersonId: PERSON,
      personName: "Мария Петрова",
      riskLevel: null,
    });
  });

  it("records a failed channel as 'failed' and still alerts everybody else", async () => {
    const push = recordingChannel("push", "owner-anna");
    const { deps, inserted } = fakeDeps([realtimeChannel, push.channel]);

    await fanOut(deps, CHECK);

    const failed = inserted.filter((a) => a.status === "failed");
    expect(failed).toEqual([
      {
        checkId: CHECK,
        recipientId: "owner-anna",
        channel: "push",
        status: "failed",
        error: "Error: subscription expired",
        sentAt: null,
      },
    ]);
    expect(inserted.filter((a) => a.status === "sent")).toHaveLength(3);
  });

  it("writes no row for a channel that answers 'skipped' (e.g. e-mails switched off)", async () => {
    const skipping: AlertChannel = { name: "email", send: async () => "skipped" };
    const { deps, inserted } = fakeDeps([realtimeChannel, skipping]);

    expect(await fanOut(deps, CHECK)).toBe(2);
    expect(inserted.map((a) => a.channel)).toEqual(["realtime", "realtime"]);
  });

  it("does nothing for a check that doesn't exist", async () => {
    const { deps, inserted } = fakeDeps([realtimeChannel], false);
    expect(await fanOut(deps, CHECK)).toBe(0);
    expect(inserted).toHaveLength(0);
  });
});

describe("notifyVerdict", () => {
  it("follows up only with contacts who have already been alerted during escalation", async () => {
    const push = recordingChannel("push");
    const { deps } = fakeDeps([push.channel]);
    deps.findCheck = async () => ({
      protected_person_id: PERSON,
      risk_level: "red",
      escalation_due_at: NOW.toISOString(),
    });
    deps.listAlertedRecipients = async () => ["owner-anna"];

    await notifyVerdict(deps, CHECK);

    expect(push.sent.map((message) => message.recipient.userId)).toEqual(["owner-anna"]);
  });

  it("sends the verdict on every channel but writes no new alerts rows", async () => {
    const push = recordingChannel("push");
    const { deps, inserted } = fakeDeps([realtimeChannel, push.channel]);

    await notifyVerdict(deps, CHECK);

    expect(inserted).toHaveLength(0);
    expect(push.sent.map((s) => s.payload.kind)).toEqual(["verdict", "verdict"]);
  });

  it("logs a failed channel and goes on", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const push = recordingChannel("push", "owner-anna");
    const { deps } = fakeDeps([push.channel]);

    await notifyVerdict(deps, CHECK);

    expect(log).toHaveBeenCalledOnce();
    expect(push.sent.map((s) => s.recipient.userId)).toEqual(["contact-ivan"]);
  });
});
