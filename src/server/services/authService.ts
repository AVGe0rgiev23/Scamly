// Registration and login for family members (and later moderators/admins).
//
// The browser sends e-mail + password to OUR API (src/app/api/auth/*), and the
// server talks to Supabase Auth. So the login cookies are written by the server
// (HttpOnly, the browser's JavaScript never sees the tokens), our rate limiter runs
// first, and every error message is Bulgarian.
//
// This file turns Supabase Auth's answers into our errors. The Supabase calls are
// behind a small AuthGateway, so the tests can use a fake one.

import "server-only";
import { bg } from "@/i18n/bg";
import { ApiError, badRequest, conflict, tooManyRequests } from "@/server/http/errors";
import type { LoginInput, RegisterInput } from "@/schemas/auth";
import type { DbClient } from "@/server/supabase/userClient";

// The answers we need from Supabase Auth. `errorCode` is Supabase's error code
// (e.g. "invalid_credentials"), or null when it worked.
export type AuthGateway = {
  signUp: (
    input: RegisterInput,
  ) => Promise<{ userId: string | null; hasSession: boolean; errorCode: string | null }>;
  signIn: (input: LoginInput) => Promise<{ userId: string | null; errorCode: string | null }>;
};

// Supabase's "slow down" error codes (its own rate limits).
const SUPABASE_RATE_LIMIT_CODES = ["over_request_rate_limit", "over_email_send_rate_limit"];

// Creates a family account. The database trigger handle_new_user() creates the
// profile with role 'family' and the display name we pass as metadata.
// needsEmailConfirmation = true when the dashboard setting "Confirm email" is on:
// then there is no session yet, and the person must click the link in the e-mail.
export async function register(
  gateway: AuthGateway,
  input: RegisterInput,
): Promise<{ userId: string | null; needsEmailConfirmation: boolean }> {
  const result = await gateway.signUp(input);

  if (result.errorCode === null) {
    // With "Confirm email" on, Supabase answers an already used e-mail exactly like
    // a new one (no session, no error), so nobody can test which e-mails exist.
    // We keep that behaviour: both cases get „Изпратихме ви писмо…“.
    return { userId: result.userId, needsEmailConfirmation: !result.hasSession };
  }

  const code = result.errorCode;
  if (code === "user_already_exists" || code === "email_exists") {
    throw conflict("email_taken", bg.auth.emailTaken);
  }
  if (code === "weak_password") {
    throw badRequest("weak_password", bg.auth.passwordWeak);
  }
  if (code === "email_address_invalid") {
    throw badRequest("email_invalid", bg.auth.emailInvalid);
  }
  if (SUPABASE_RATE_LIMIT_CODES.includes(code)) {
    throw tooManyRequests();
  }
  throw new Error(`signUp failed with Supabase code ${code}`);
}

// Logs in with e-mail + password. A wrong e-mail and a wrong password get the SAME
// answer („Грешен имейл или парола.“), so login never reveals whether an e-mail
// has an account.
export async function login(gateway: AuthGateway, input: LoginInput): Promise<{ userId: string }> {
  const result = await gateway.signIn(input);

  if (result.errorCode === null && result.userId !== null) {
    return { userId: result.userId };
  }

  const code = result.errorCode ?? "unknown";
  if (code === "invalid_credentials") {
    throw new ApiError(401, "invalid_credentials", bg.auth.invalidCredentials);
  }
  // Supabase says this only after a CORRECT password, so it reveals nothing new.
  if (code === "email_not_confirmed") {
    throw new ApiError(403, "email_not_confirmed", bg.auth.emailNotConfirmed);
  }
  if (SUPABASE_RATE_LIMIT_CODES.includes(code)) {
    throw tooManyRequests();
  }
  throw new Error(`signInWithPassword failed with Supabase code ${code}`);
}

// The real gateway: the user client's auth functions. On success they write the
// session cookies through the client's setAll (src/server/supabase/userClient.ts).
export function supabaseAuthGateway(client: DbClient): AuthGateway {
  return {
    signUp: async (input) => {
      const { data, error } = await client.auth.signUp({
        email: input.email,
        password: input.password,
        options: { data: { display_name: input.displayName } },
      });
      return {
        userId: data.user?.id ?? null,
        hasSession: data.session !== null,
        errorCode: error ? (error.code ?? "unknown") : null,
      };
    },
    signIn: async (input) => {
      const { data, error } = await client.auth.signInWithPassword({
        email: input.email,
        password: input.password,
      });
      return {
        userId: data.user?.id ?? null,
        errorCode: error ? (error.code ?? "unknown") : null,
      };
    },
  };
}
