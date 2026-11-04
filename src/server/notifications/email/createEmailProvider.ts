// Chooses the e-mail provider from the environment (EMAIL_PROVIDER, ADR 0003).
//
//   noop    (the default) sends nothing
//   brevo   sends through Brevo; needs BREVO_API_KEY and EMAIL_FROM. If one is
//           missing we don't crash: we warn and send nothing (noop) instead.
//   resend  the stub that explains it needs our own domain
//
// Switching provider is a change of ONE environment variable, never of code (D5).

import type { ServerEnv } from "@/lib/env";
import { createBrevoEmailProvider } from "@/server/notifications/email/brevoEmailProvider";
import type { EmailProvider } from "@/server/notifications/email/emailProvider";
import { createNoopEmailProvider } from "@/server/notifications/email/noopEmailProvider";
import { createResendEmailProvider } from "@/server/notifications/email/resendEmailProvider";

export function createEmailProvider(env: ServerEnv, fetchFn?: typeof fetch): EmailProvider {
  if (env.EMAIL_PROVIDER === "brevo") {
    if (env.BREVO_API_KEY === undefined || env.EMAIL_FROM === undefined) {
      // Names of the variables only, never their values.
      console.warn(
        "[email] EMAIL_PROVIDER=brevo, but BREVO_API_KEY or EMAIL_FROM is missing: using noop",
      );
      return createNoopEmailProvider();
    }
    return createBrevoEmailProvider({
      apiKey: env.BREVO_API_KEY,
      from: env.EMAIL_FROM,
      fetchFn,
    });
  }
  if (env.EMAIL_PROVIDER === "resend") {
    return createResendEmailProvider();
  }
  return createNoopEmailProvider();
}
