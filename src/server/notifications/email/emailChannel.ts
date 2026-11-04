// The e-mail alert channel (W2-06, ADR 0003): an AlertChannel for alertService.ts.
//
// Who gets an e-mail: a family member with a Scamly account in the person's contact
// list (alertService already keeps only those), whose profiles.email_alerts is true
// and whose account has a real e-mail address.
//
// When (risk R4, at most one e-mail per alert per recipient):
//   kind "started"  one e-mail: „Мария проверява съмнително обаждане“
//   kind "verdict"  a short follow-up ONLY when the verdict is red; otherwise nothing
//
// send() returns "skipped" when there is nothing to send to this person (e-mails
// switched off, no address, not red, or EMAIL_PROVIDER=noop): then the alert service
// writes no alerts row, because no e-mail went out. send() throws when Brevo refused
// the e-mail or didn't answer: the alert service writes a "failed" row and goes on.
//
// The service role is used to read the addresses (BUILD_PLAN 2.4 use 4): they are in
// auth.users, and the profiles of OTHER users are not readable through RLS.

import "server-only";
import { getServerEnv, type ServerEnv } from "@/lib/env";
import { buildAlertEmail } from "@/server/notifications/email/alertEmail";
import { createEmailProvider } from "@/server/notifications/email/createEmailProvider";
import type { EmailProvider } from "@/server/notifications/email/emailProvider";
import { getSiteUrl } from "@/server/notifications/siteUrl";
import { findAuthUserEmail } from "@/server/repositories/authUsersRepository";
import { findProfileById } from "@/server/repositories/profilesRepository";
import type { AlertChannel } from "@/server/services/alertService";
import type { DbClient } from "@/server/supabase/userClient";

// What we need to know about one family member (like a small Python dataclass).
export type EmailRecipientInfo = {
  email: string | null; // the login address, null if the account has none
  emailAlerts: boolean; // profiles.email_alerts: does the person want alert e-mails?
};

// Everything the e-mail channel needs from the outside world (tests pass fakes).
export type EmailChannelDeps = {
  provider: EmailProvider;
  siteUrl: string;
  now: () => Date;
  findRecipient: (userId: string) => Promise<EmailRecipientInfo | null>;
};

// Device accounts of protected persons use addresses on the reserved ".invalid"
// domain (pairingService). They can never receive mail, so we never try.
function canReceiveMail(email: string): boolean {
  return email.includes("@") && !email.toLowerCase().endsWith(".invalid");
}

export function createEmailChannel(deps: EmailChannelDeps): AlertChannel {
  return {
    name: "email",
    send: async (recipient, payload) => {
      // The follow-up after the answers: only for a red verdict.
      if (payload.kind === "verdict" && payload.riskLevel !== "red") {
        return "skipped";
      }
      // No name means the person was deleted in the meantime: nothing to say.
      if (payload.personName.trim() === "") {
        return "skipped";
      }

      const info = await deps.findRecipient(recipient.userId);
      if (info === null || !info.emailAlerts || info.email === null) {
        return "skipped";
      }
      if (!canReceiveMail(info.email)) {
        return "skipped";
      }

      const content = buildAlertEmail({ payload, siteUrl: deps.siteUrl, sentAt: deps.now() });
      // `...content` copies subject, text and html in (like {**content} in Python).
      await deps.provider.send({ to: info.email, ...content });

      // With EMAIL_PROVIDER=noop nothing was really sent, so we don't claim "sent".
      if (deps.provider.name === "noop") {
        return "skipped";
      }
    },
  };
}

// The real e-mail channel: provider from EMAIL_PROVIDER, addresses through the admin
// client (service role, use 4).
export function createRealEmailChannel(
  admin: DbClient,
  env: ServerEnv = getServerEnv(),
): AlertChannel {
  return createEmailChannel({
    provider: createEmailProvider(env),
    siteUrl: getSiteUrl(env),
    now: () => new Date(),
    findRecipient: async (userId) => {
      const profile = await findProfileById(admin, userId);
      if (profile === null) {
        return null;
      }
      // Ask auth.users for the address only when the person wants e-mails.
      if (!profile.email_alerts) {
        return { email: null, emailAlerts: false };
      }
      return { email: await findAuthUserEmail(admin, userId), emailAlerts: true };
    },
  });
}
