// NoopEmailProvider: sends nothing (EMAIL_PROVIDER=noop, the default, ADR 0003).
//
// Used for local work and in CI, so nobody ever receives a test e-mail by accident,
// and as the safe fallback when Brevo is chosen but not configured.

import type { EmailProvider } from "@/server/notifications/email/emailProvider";

export function createNoopEmailProvider(): EmailProvider {
  return {
    name: "noop",
    send: async () => {
      // Only this short line: never the address, the subject or the text.
      console.info("[email] email skipped (noop)");
    },
  };
}
