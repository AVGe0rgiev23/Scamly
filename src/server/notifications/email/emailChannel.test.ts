// Unit tests for the e-mail alert channel (emailChannel.ts), alone and inside the
// real fanOut() / notifyVerdict() of alertService.ts, with fakes instead of Supabase
// and Brevo (no real e-mail is ever sent).

import { describe, expect, it } from "vitest";
import type { NewAlert } from "@/server/repositories/alertsRepository";
import {
  createEmailChannel,
  type EmailRecipientInfo,
} from "@/server/notifications/email/emailChannel";
import type { EmailMessage, EmailProvider } from "@/server/notifications/email/emailProvider";
import {
  fanOut,
  notifyVerdict,
  realtimeChannel,
  type AlertDeps,
  type ContactRef,
} from "@/server/services/alertService";
import type { RiskLevel } from "@/engine";

const CHECK = "0f1e2d3c-0000-4000-8000-000000000001";
const PERSON = "person-maria";
const NOW = new Date("2026-11-09T10:05:00Z");

// Мария's contacts: Анна and Иван have accounts, Пенка is phone-only.
const CONTACTS: ContactRef[] = [
  { user_id: "owner-anna", display_name: "Анна", phone: "0888 111 222", priority: 1 },
  { user_id: "contact-ivan", display_name: "Иван", phone: "0899 333 444", priority: 2 },
  { user_id: null, display_name: "Пенка", phone: "0877 555 666", priority: 3 },
];

// What the database says about each account's e-mail.
const PEOPLE: Record<string, EmailRecipientInfo> = {
  "owner-anna": { email: "anna@example.com", emailAlerts: true },
  "contact-ivan": { email: "ivan@example.com", emailAlerts: false }, // switched off
};

// A provider that records the e-mails instead of sending them (and can fail).
function recordingProvider(name: EmailProvider["name"] = "brevo", fail: boolean = false) {
  const sent: EmailMessage[] = [];
  const provider: EmailProvider = {
    name,
    send: async (message) => {
      if (fail) {
        throw new Error("Brevo answered HTTP 500");
      }
      sent.push(message);
    },
  };
  return { provider, sent };
}

function setup(options: {
  riskLevel?: RiskLevel | null;
  people?: Record<string, EmailRecipientInfo>;
  providerName?: EmailProvider["name"];
  fail?: boolean;
}) {
  const people = options.people ?? PEOPLE;
  const { provider, sent } = recordingProvider(options.providerName, options.fail);
  const email = createEmailChannel({
    provider,
    siteUrl: "https://scamly.vercel.app",
    now: () => NOW,
    findRecipient: async (userId) => people[userId] ?? null,
  });
  const inserted: NewAlert[] = [];
  const deps: AlertDeps = {
    now: () => NOW,
    findCheck: async () => ({
      protected_person_id: PERSON,
      risk_level: options.riskLevel ?? null,
    }),
    findPersonName: async () => "Мария Петрова",
    listContacts: async () => CONTACTS,
    insertAlerts: async (alerts) => {
      inserted.push(...alerts);
    },
    channels: [realtimeChannel, email],
  };
  return { deps, sent, inserted };
}

describe("email channel in fanOut (the check starts)", () => {
  it("sends one e-mail to each linked contact who wants e-mails, and writes a 'sent' row", async () => {
    const { deps, sent, inserted } = setup({});

    await fanOut(deps, CHECK);

    // Анна only: Иван switched e-mails off, Пенка has no account.
    expect(sent.map((m) => m.to)).toEqual(["anna@example.com"]);
    const emailRows = inserted.filter((row) => row.channel === "email");
    expect(emailRows).toEqual([
      {
        checkId: CHECK,
        recipientId: "owner-anna",
        channel: "email",
        status: "sent",
        error: null,
        sentAt: NOW,
      },
    ]);
    // The realtime rows are still there for both linked contacts.
    expect(inserted.filter((row) => row.channel === "realtime")).toHaveLength(2);
  });

  it("sends nothing to a contact with e-mail alerts switched off", async () => {
    const { deps, sent, inserted } = setup({
      people: { "owner-anna": { email: "anna@example.com", emailAlerts: false } },
    });

    await fanOut(deps, CHECK);

    expect(sent).toHaveLength(0);
    expect(inserted.filter((row) => row.channel === "email")).toHaveLength(0);
  });

  it("never e-mails a device account (.invalid address) or an account without one", async () => {
    const { deps, sent } = setup({
      people: {
        "owner-anna": { email: "device-1@devices.scamly.invalid", emailAlerts: true },
        "contact-ivan": { email: null, emailAlerts: true },
      },
    });
    await fanOut(deps, CHECK);
    expect(sent).toHaveLength(0);
  });

  it("records a Brevo failure as a 'failed' row and still writes the realtime rows", async () => {
    const { deps, inserted } = setup({ fail: true });

    await expect(fanOut(deps, CHECK)).resolves.toBe(3);

    expect(inserted.filter((row) => row.channel === "email")).toEqual([
      {
        checkId: CHECK,
        recipientId: "owner-anna",
        channel: "email",
        status: "failed",
        error: "Error: Brevo answered HTTP 500",
        sentAt: null,
      },
    ]);
    expect(inserted.filter((row) => row.status === "sent")).toHaveLength(2);
  });

  it("writes no e-mail row with EMAIL_PROVIDER=noop (nothing was really sent)", async () => {
    const { deps, sent, inserted } = setup({ providerName: "noop" });

    await fanOut(deps, CHECK);

    expect(sent).toHaveLength(1); // the noop provider was asked (it only logs)
    expect(inserted.filter((row) => row.channel === "email")).toHaveLength(0);
  });

  it("puts no phone numbers or call details in the e-mail", async () => {
    const { deps, sent } = setup({});
    await fanOut(deps, CHECK);

    const message = sent[0];
    expect(message).toBeDefined();
    const everything = `${message?.subject}\n${message?.text}\n${message?.html}`;
    for (const contact of CONTACTS) {
      expect(everything).not.toContain(contact.phone ?? "no phone");
    }
    expect(everything).toContain("Мария Петрова");
    expect(everything).toContain(`/family/alerts?check=${CHECK}`);
  });
});

describe("email channel in notifyVerdict (the answers arrived)", () => {
  it("sends a short follow-up only when the verdict is red", async () => {
    const { deps, sent } = setup({ riskLevel: "red" });

    await notifyVerdict(deps, CHECK);

    expect(sent.map((m) => m.to)).toEqual(["anna@example.com"]);
    expect(sent[0]?.subject).toContain("Внимание!");
    expect(sent[0]?.text).toContain("Ниво на риска: високо");
  });

  it("sends nothing for a yellow or green verdict", async () => {
    for (const level of ["yellow", "green"] as const) {
      const { deps, sent } = setup({ riskLevel: level });
      await notifyVerdict(deps, CHECK);
      expect(sent).toHaveLength(0);
    }
  });
});
