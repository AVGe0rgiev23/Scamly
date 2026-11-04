// Unit tests for the e-mail providers and for choosing one (W2-06, ADR 0003).
// Brevo is tested with a FAKE fetch, so these tests never send a real e-mail.

import { afterEach, describe, expect, it, vi } from "vitest";
import { getServerEnv } from "@/lib/env";
import {
  BREVO_SEND_URL,
  createBrevoEmailProvider,
} from "@/server/notifications/email/brevoEmailProvider";
import { createEmailProvider } from "@/server/notifications/email/createEmailProvider";
import type { EmailMessage } from "@/server/notifications/email/emailProvider";
import { createNoopEmailProvider } from "@/server/notifications/email/noopEmailProvider";
import { RESEND_NOT_CONFIGURED } from "@/server/notifications/email/resendEmailProvider";

// The required variables, with fake values (never real keys in tests).
const BASE_ENV = {
  NEXT_PUBLIC_SUPABASE_URL: "http://127.0.0.1:54321",
  NEXT_PUBLIC_SUPABASE_ANON_KEY: "fake-anon-key",
  SUPABASE_SERVICE_ROLE_KEY: "fake-service-role-key",
  PAIRING_PEPPER: "a".repeat(32),
  HASH_PEPPER: "b".repeat(32),
};
const FAKE_KEY = "xkeysib-fake-test-key";
const FROM = "alerts@example.com";
const MESSAGE: EmailMessage = {
  to: "anna.petrova@example.com",
  subject: "Тема",
  text: "Текст",
  html: "<p>Текст</p>",
};

// A fake fetch that remembers each request and answers with `status` and `body`.
function fakeFetch(status: number, body: unknown = { messageId: "<1@brevo>" }) {
  const calls: { url: string; init: RequestInit }[] = [];
  const fetchFn = async (url: string | URL | Request, init?: RequestInit) => {
    calls.push({ url: String(url), init: init ?? {} });
    return new Response(JSON.stringify(body), { status });
  };
  // `as typeof fetch`: our small function is enough for the provider, so we tell
  // TypeScript to accept it as fetch (like duck typing in Python).
  return { fetchFn: fetchFn as typeof fetch, calls };
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("createEmailProvider", () => {
  it("uses noop when EMAIL_PROVIDER is not set (the default)", () => {
    expect(createEmailProvider(getServerEnv(BASE_ENV)).name).toBe("noop");
  });

  it("uses Brevo when it is chosen and has a key and a sender", () => {
    const env = getServerEnv({
      ...BASE_ENV,
      EMAIL_PROVIDER: "brevo",
      BREVO_API_KEY: FAKE_KEY,
      EMAIL_FROM: FROM,
    });
    expect(createEmailProvider(env).name).toBe("brevo");
  });

  it("falls back to noop with a warning (no crash) when Brevo has no key", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const env = getServerEnv({ ...BASE_ENV, EMAIL_PROVIDER: "brevo", EMAIL_FROM: FROM });

    expect(createEmailProvider(env).name).toBe("noop");
    expect(warn).toHaveBeenCalledOnce();
  });

  it("falls back to noop when Brevo has no sender address", () => {
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const env = getServerEnv({ ...BASE_ENV, EMAIL_PROVIDER: "brevo", BREVO_API_KEY: FAKE_KEY });
    expect(createEmailProvider(env).name).toBe("noop");
  });

  it("gives the Resend stub, which refuses with a clear message", async () => {
    const provider = createEmailProvider(getServerEnv({ ...BASE_ENV, EMAIL_PROVIDER: "resend" }));
    expect(provider.name).toBe("resend");
    await expect(provider.send(MESSAGE)).rejects.toThrow(RESEND_NOT_CONFIGURED);
  });
});

describe("NoopEmailProvider", () => {
  it("sends nothing and logs only one short line, without the address", async () => {
    const info = vi.spyOn(console, "info").mockImplementation(() => undefined);
    await createNoopEmailProvider().send(MESSAGE);
    expect(info).toHaveBeenCalledWith("[email] email skipped (noop)");
  });
});

describe("BrevoEmailProvider", () => {
  it("POSTs the e-mail to Brevo's API with the key in the api-key header", async () => {
    const { fetchFn, calls } = fakeFetch(201);
    const provider = createBrevoEmailProvider({ apiKey: FAKE_KEY, from: FROM, fetchFn });

    await provider.send(MESSAGE);

    expect(calls).toHaveLength(1);
    expect(calls[0]?.url).toBe(BREVO_SEND_URL);
    expect(calls[0]?.url).toBe("https://api.brevo.com/v3/smtp/email");
    const init = calls[0]?.init;
    expect(init?.method).toBe("POST");
    expect(init?.headers).toEqual({
      "api-key": FAKE_KEY,
      "content-type": "application/json",
      accept: "application/json",
    });
    expect(init?.signal).toBeInstanceOf(AbortSignal);
    expect(JSON.parse(String(init?.body))).toEqual({
      sender: { name: "Scamly", email: FROM },
      to: [{ email: "anna.petrova@example.com" }],
      subject: "Тема",
      textContent: "Текст",
      htmlContent: "<p>Текст</p>",
    });
  });

  it("throws on an HTTP error, keeping only Brevo's short error code", async () => {
    const { fetchFn } = fakeFetch(401, {
      code: "unauthorized",
      message: "Key not found for anna.petrova@example.com",
    });
    const provider = createBrevoEmailProvider({ apiKey: FAKE_KEY, from: FROM, fetchFn });

    const error = await provider.send(MESSAGE).catch((e: unknown) => e);

    expect(error).toBeInstanceOf(Error);
    const text = (error as Error).message;
    expect(text).toBe("Brevo answered HTTP 401 (unauthorized)");
    expect(text).not.toContain(FAKE_KEY);
    expect(text).not.toContain("anna.petrova");
  });

  it("throws when Brevo doesn't answer in time", async () => {
    // A fetch that never answers until the timeout signal aborts it (like the real one).
    const hangingFetch = (_url: string | URL | Request, init?: RequestInit) =>
      new Promise<Response>((_resolve, reject) => {
        init?.signal?.addEventListener("abort", () => reject(init.signal?.reason));
      });
    const provider = createBrevoEmailProvider({
      apiKey: FAKE_KEY,
      from: FROM,
      fetchFn: hangingFetch as typeof fetch,
      timeoutMs: 20,
    });

    await expect(provider.send(MESSAGE)).rejects.toThrow("Brevo did not answer within 20 ms");
  });

  it("throws a short message when the network fails", async () => {
    const brokenFetch = async () => {
      throw new TypeError(`fetch failed for ${FAKE_KEY}`);
    };
    const provider = createBrevoEmailProvider({
      apiKey: FAKE_KEY,
      from: FROM,
      fetchFn: brokenFetch as typeof fetch,
    });

    await expect(provider.send(MESSAGE)).rejects.toThrow("Brevo request failed (TypeError)");
  });
});
