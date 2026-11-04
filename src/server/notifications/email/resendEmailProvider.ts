// ResendEmailProvider: a placeholder for the day we have our own domain (ADR 0003).
//
// Resend sends to other people only from a verified domain of our own, and we don't
// have one (Q13, D11). Writing and testing a real sender now would be code that can't
// work, so this stub only explains the problem. With EMAIL_PROVIDER=resend every
// alert e-mail is marked "failed" with this message (the other channels still work).

import type { EmailProvider } from "@/server/notifications/email/emailProvider";

export const RESEND_NOT_CONFIGURED =
  "Resend is not configured: it needs our own domain, see ADR 0003. Use EMAIL_PROVIDER=brevo or noop.";

export function createResendEmailProvider(): EmailProvider {
  return {
    name: "resend",
    send: async () => {
      throw new Error(RESEND_NOT_CONFIGURED);
    },
  };
}
