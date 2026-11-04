// Family alerts („Семеен щит“, BUILD_PLAN 3 #17–#18, decision D7, task W2-03).
//
//   fanOut(checkId)        the big button was pressed: alert every trusted contact
//                          who has a Scamly account, on every channel, and write one
//                          alerts row per (contact, channel)
//   notifyVerdict(checkId) the answers arrived: tell the channels about the verdict
//
// Channels: an AlertChannel is anything with a `name` and a `send(recipient, payload)`
// function (like a Python Protocol with one method). Today there is only one:
//
//   realtime  The family member's open page subscribes to Supabase Realtime. The
//             alerts row we INSERT (and the checks row the check service UPDATEs)
//             IS the message: Realtime sees the change and pushes it to the page,
//             filtered by RLS. So its send() has nothing left to do.
//
// Web push (W2-05) and e-mail (W2-06) will be two more AlertChannel objects added to
// the list in createAlertDeps(); fanOut() and notifyVerdict() don't change.
//
// The service role is used here (BUILD_PLAN 2.4, use 4): the alerts rows belong to
// OTHER users, which no RLS policy lets the phone write. fanOut() is only called by
// the check service, after it has checked that the phone owns the check.

import "server-only";
import type { RiskLevel } from "@/engine";
import {
  insertAlerts,
  type AlertChannelName,
  type AlertStatus,
  type NewAlert,
} from "@/server/repositories/alertsRepository";
import { findCheckById } from "@/server/repositories/checksRepository";
import { listContacts } from "@/server/repositories/contactsRepository";
import { findPersonById } from "@/server/repositories/personsRepository";
import type { DbClient } from "@/server/supabase/userClient";

// The fields the call check needs about one trusted contact (a row of
// trusted_contacts has a few more; those are simply not used).
export type ContactRef = {
  user_id: string | null; // null = a contact without a Scamly account (phone only)
  display_name: string;
  phone: string | null;
  priority: number; // 1 = called first
};

// Who receives an alert: a trusted contact with a Scamly account.
export type AlertRecipient = {
  userId: string;
  displayName: string;
};

// What every channel gets to say. Push and e-mail will turn it into a short
// Bulgarian message („Мария провери обаждане…“); the realtime page reads the check.
export type AlertPayload = {
  kind: "started" | "verdict";
  checkId: string;
  protectedPersonId: string;
  personName: string;
  riskLevel: RiskLevel | null; // null while the check is only "started"
};

// One way of reaching a family member. send() throws when delivery fails.
export type AlertChannel = {
  name: AlertChannelName;
  send: (recipient: AlertRecipient, payload: AlertPayload) => Promise<void>;
};

// The realtime channel (D7, the primary one). See the top of this file: the database
// row is the message, so there is nothing more to send.
export const realtimeChannel: AlertChannel = {
  name: "realtime",
  send: async () => {
    // Nothing to do: Supabase Realtime delivers the INSERT / UPDATE to the open page.
  },
};

// Everything the alert service needs from the outside world (tests pass fakes).
export type AlertDeps = {
  now: () => Date;
  findCheck: (
    checkId: string,
  ) => Promise<{ protected_person_id: string; risk_level: RiskLevel | null } | null>;
  findPersonName: (personId: string) => Promise<string | null>;
  listContacts: (personId: string) => Promise<ContactRef[]>;
  insertAlerts: (alerts: NewAlert[]) => Promise<void>;
  channels: AlertChannel[];
};

// The contacts who can be alerted: only those with an account (user_id). A contact
// without an account is only in the „Обади се на …“ list on the phone.
export function recipientsFrom(contacts: ContactRef[]): AlertRecipient[] {
  const recipients: AlertRecipient[] = [];
  for (const contact of contacts) {
    if (contact.user_id !== null) {
      recipients.push({ userId: contact.user_id, displayName: contact.display_name });
    }
  }
  return recipients;
}

// Loads the check, its person's name and the recipients. null = the check is gone.
async function loadAlertContext(
  deps: AlertDeps,
  checkId: string,
  kind: AlertPayload["kind"],
): Promise<{ payload: AlertPayload; recipients: AlertRecipient[] } | null> {
  const check = await deps.findCheck(checkId);
  if (check === null) {
    return null;
  }
  const personId = check.protected_person_id;
  const personName = (await deps.findPersonName(personId)) ?? "";
  const recipients = recipientsFrom(await deps.listContacts(personId));
  const payload: AlertPayload = {
    kind,
    checkId,
    protectedPersonId: personId,
    personName,
    riskLevel: check.risk_level,
  };
  return { payload, recipients };
}

// A short, safe description of a failed delivery for alerts.error (no stack trace).
function describeError(error: unknown): string {
  return error instanceof Error ? `${error.name}: ${error.message}` : String(error);
}

// ---------------------------------------------------------------------------------
// fanOut: called right after POST /api/checks created the check.
// Returns how many alerts rows were written.
// ---------------------------------------------------------------------------------
export async function fanOut(deps: AlertDeps, checkId: string): Promise<number> {
  const context = await loadAlertContext(deps, checkId, "started");
  if (context === null) {
    return 0;
  }

  const rows: NewAlert[] = [];
  for (const recipient of context.recipients) {
    for (const channel of deps.channels) {
      // One channel failing (e.g. an expired push subscription) must not stop the
      // other channels or the other family members: we write "failed" and go on.
      let status: AlertStatus = "sent";
      let errorText: string | null = null;
      try {
        await channel.send(recipient, context.payload);
      } catch (error) {
        status = "failed";
        errorText = describeError(error);
      }
      rows.push({
        checkId,
        recipientId: recipient.userId,
        channel: channel.name,
        status,
        error: errorText,
        sentAt: status === "sent" ? deps.now() : null,
      });
    }
  }
  // All rows in ONE insert: one trip to the database, and every family member's
  // page gets its Realtime message at the same moment.
  if (rows.length > 0) {
    await deps.insertAlerts(rows);
  }
  return rows.length;
}

// ---------------------------------------------------------------------------------
// notifyVerdict: called after PUT /api/checks/:id/answers stored the verdict.
// No new alerts rows (there is one per check, member and channel); the realtime page
// already got the UPDATE of the checks row. Push and e-mail will send "it is red".
// ---------------------------------------------------------------------------------
export async function notifyVerdict(deps: AlertDeps, checkId: string): Promise<void> {
  const context = await loadAlertContext(deps, checkId, "verdict");
  if (context === null) {
    return;
  }
  for (const recipient of context.recipients) {
    for (const channel of deps.channels) {
      try {
        await channel.send(recipient, context.payload);
      } catch (error) {
        console.error(`[alerts] ${channel.name} verdict failed:`, describeError(error));
      }
    }
  }
}

// ---------------------------------------------------------------------------------
// The real deps: everything through the admin client (service role, use 4).
// ---------------------------------------------------------------------------------
export function createAlertDeps(admin: DbClient): AlertDeps {
  return {
    now: () => new Date(),
    findCheck: (checkId) => findCheckById(admin, checkId),
    findPersonName: async (personId) => {
      const person = await findPersonById(admin, personId);
      return person === null ? null : person.display_name;
    },
    listContacts: (personId) => listContacts(admin, personId),
    insertAlerts: (alerts) => insertAlerts(admin, alerts),
    channels: [realtimeChannel],
  };
}
