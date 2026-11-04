// The EmailProvider interface: "something that can send one e-mail" (ADR 0003, D5).
//
// The rest of the app only knows this small interface, never Brevo itself. Which real
// provider is used is decided by one environment variable, EMAIL_PROVIDER
// (createEmailProvider.ts), so switching to "noop" needs no code change.

// One e-mail. `html` is optional: every e-mail also has a plain-text version.
// (A TypeScript type like this is like a Python TypedDict.)
export type EmailMessage = {
  to: string;
  subject: string;
  text: string;
  html?: string;
};

// The three providers we know about (the same names as EMAIL_PROVIDER).
export type EmailProviderName = "brevo" | "resend" | "noop";

// Anything with a `name` and a `send()` function is an EmailProvider
// (like a Python Protocol). send() throws an Error when the e-mail was not accepted;
// the alert service then marks that alert as "failed".
export type EmailProvider = {
  name: EmailProviderName;
  send: (message: EmailMessage) => Promise<void>;
};
