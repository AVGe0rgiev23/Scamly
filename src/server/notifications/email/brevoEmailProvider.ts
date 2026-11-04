// BrevoEmailProvider: sends one e-mail through Brevo's free tier (ADR 0003, D5).
//
// It is a single HTTPS request to Brevo's "transactional e-mail" API, made with the
// built-in fetch() (like Python's requests.post), so no extra library is needed:
//
//   POST https://api.brevo.com/v3/smtp/email
//   header  api-key: <BREVO_API_KEY>
//   body    { sender, to, subject, textContent, htmlContent }
//
// Brevo answers 201 when it accepted the e-mail. Anything else, no answer within
// 5 seconds, or no network → send() throws, and the alert is marked "failed".
//
// Safety: the API key is only ever put in the request header. Error messages never
// contain the key, the recipient's address or the e-mail text, because they are
// stored in alerts.error and may be printed in logs.

import { APP_NAME } from "@/config/app";
import type { EmailMessage, EmailProvider } from "@/server/notifications/email/emailProvider";

export const BREVO_SEND_URL = "https://api.brevo.com/v3/smtp/email";
const DEFAULT_TIMEOUT_MS = 5000;

// What the Brevo provider needs. fetchFn and timeoutMs are only changed by tests
// (a fake fetch, so tests never send real e-mail).
export type BrevoOptions = {
  apiKey: string;
  from: string; // the verified sender address (EMAIL_FROM)
  fetchFn?: typeof fetch;
  timeoutMs?: number;
};

export function createBrevoEmailProvider(options: BrevoOptions): EmailProvider {
  // `??` means "use the right side when the left is missing" (like Python's `or`,
  // but only for None/undefined).
  const fetchFn = options.fetchFn ?? fetch;
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;

  return {
    name: "brevo",
    send: async (message: EmailMessage) => {
      const body = {
        sender: { name: APP_NAME, email: options.from },
        to: [{ email: message.to }],
        subject: message.subject,
        textContent: message.text,
        htmlContent: message.html,
      };

      let response: Response;
      try {
        response = await fetchFn(BREVO_SEND_URL, {
          method: "POST",
          headers: {
            "api-key": options.apiKey,
            "content-type": "application/json",
            accept: "application/json",
          },
          body: JSON.stringify(body),
          // Gives up after timeoutMs, so a slow Brevo can't hold up the alerts.
          signal: AbortSignal.timeout(timeoutMs),
        });
      } catch (error) {
        // Only the error's NAME: its message could contain details we don't want stored.
        if (error instanceof Error && error.name === "TimeoutError") {
          throw new Error(`Brevo did not answer within ${timeoutMs} ms`);
        }
        const name = error instanceof Error ? error.name : "unknown error";
        throw new Error(`Brevo request failed (${name})`);
      }

      if (response.status !== 201) {
        throw new Error(`Brevo answered HTTP ${response.status}${await brevoErrorCode(response)}`);
      }
    },
  };
}

// Brevo's error answers look like { "code": "unauthorized", "message": "..." }.
// We keep only the short code (e.g. " (unauthorized)"); the message is dropped
// because it can repeat the recipient's address.
async function brevoErrorCode(response: Response): Promise<string> {
  try {
    const data: unknown = await response.json();
    if (typeof data === "object" && data !== null && "code" in data) {
      const code = data.code;
      if (typeof code === "string" && /^[a-z_]{1,40}$/.test(code)) {
        return ` (${code})`;
      }
    }
  } catch {
    // Not JSON: the HTTP status alone is enough.
  }
  return "";
}
