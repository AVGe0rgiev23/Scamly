// Unit tests for authService.ts: Supabase Auth answers -> our Bulgarian errors.
// Uses a fake AuthGateway, so no network.

import { describe, expect, it } from "vitest";
import { bg } from "@/i18n/bg";
import { login, register, type AuthGateway } from "@/server/services/authService";

const registerInput = { email: "ivan@example.com", password: "dalgaparola", displayName: "Иван" };
const loginInput = { email: "ivan@example.com", password: "dalgaparola" };

// A fake gateway whose answers we choose in each test.
function gateway(answers: {
  signUp?: { userId: string | null; hasSession: boolean; errorCode: string | null };
  signIn?: { userId: string | null; errorCode: string | null };
}): AuthGateway {
  return {
    signUp: async () => answers.signUp ?? { userId: null, hasSession: false, errorCode: "unknown" },
    signIn: async () => answers.signIn ?? { userId: null, errorCode: "unknown" },
  };
}

describe("register", () => {
  it("logs the person in right away when e-mail confirmation is off", async () => {
    const result = await register(
      gateway({ signUp: { userId: "u1", hasSession: true, errorCode: null } }),
      registerInput,
    );
    expect(result).toEqual({ userId: "u1", needsEmailConfirmation: false });
  });

  it("asks to confirm the e-mail when Supabase gives no session", async () => {
    const result = await register(
      gateway({ signUp: { userId: "u1", hasSession: false, errorCode: null } }),
      registerInput,
    );
    expect(result.needsEmailConfirmation).toBe(true);
  });

  it("answers 409 with a Bulgarian message for a used e-mail", async () => {
    await expect(
      register(
        gateway({ signUp: { userId: null, hasSession: false, errorCode: "user_already_exists" } }),
        registerInput,
      ),
    ).rejects.toMatchObject({ status: 409, code: "email_taken", messageBg: bg.auth.emailTaken });
  });

  it("answers 400 for a password Supabase finds too weak", async () => {
    await expect(
      register(
        gateway({ signUp: { userId: null, hasSession: false, errorCode: "weak_password" } }),
        registerInput,
      ),
    ).rejects.toMatchObject({ status: 400, messageBg: bg.auth.passwordWeak });
  });

  it("answers 429 when Supabase's own limit is reached", async () => {
    await expect(
      register(
        gateway({
          signUp: { userId: null, hasSession: false, errorCode: "over_email_send_rate_limit" },
        }),
        registerInput,
      ),
    ).rejects.toMatchObject({ status: 429 });
  });

  it("turns unknown Supabase errors into a plain Error (-> friendly 500)", async () => {
    await expect(
      register(
        gateway({ signUp: { userId: null, hasSession: false, errorCode: "unexpected_failure" } }),
        registerInput,
      ),
    ).rejects.not.toHaveProperty("status");
  });
});

describe("login", () => {
  it("returns the user id after a correct password", async () => {
    const result = await login(gateway({ signIn: { userId: "u1", errorCode: null } }), loginInput);
    expect(result).toEqual({ userId: "u1" });
  });

  it("gives the same message for a wrong e-mail or password (no account check possible)", async () => {
    await expect(
      login(gateway({ signIn: { userId: null, errorCode: "invalid_credentials" } }), loginInput),
    ).rejects.toMatchObject({
      status: 401,
      code: "invalid_credentials",
      messageBg: bg.auth.invalidCredentials,
    });
  });

  it("asks to confirm the e-mail first", async () => {
    await expect(
      login(gateway({ signIn: { userId: null, errorCode: "email_not_confirmed" } }), loginInput),
    ).rejects.toMatchObject({ status: 403, messageBg: bg.auth.emailNotConfirmed });
  });
});
