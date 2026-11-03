// POST /api/auth/login: log in with e-mail + password (guest, rate-limited per IP).
// Body: { email, password }. 200 { role, displayName } + session cookies.
// A wrong e-mail and a wrong password get the same 401 „Грешен имейл или парола.“

import { LoginSchema } from "@/schemas/auth";
import { handleApiError, json } from "@/server/http/errors";
import { getClientIp, readJsonBody } from "@/server/http/request";
import { findProfileById } from "@/server/repositories/profilesRepository";
import { assertSameOrigin } from "@/server/security/origin";
import { enforceIpRateLimit, RATE_LIMITS } from "@/server/security/rateLimit";
import { login, supabaseAuthGateway } from "@/server/services/authService";
import { createUserClient } from "@/server/supabase/userClient";

export async function POST(request: Request) {
  try {
    assertSameOrigin(request); // 0. from our own site? (CSRF)
    await enforceIpRateLimit(RATE_LIMITS.loginPerIp, getClientIp(request)); // 1. not too many tries?
    const input = LoginSchema.parse(await readJsonBody(request)); // 2. valid input? (400)
    const client = await createUserClient();
    const { userId } = await login(supabaseAuthGateway(client), input); // 3. check the password
    // The client is now logged in, so RLS lets it read its own profile.
    const profile = await findProfileById(client, userId);
    if (profile === null) {
      throw new Error("login: the account has no profile");
    }
    return json({ role: profile.role, displayName: profile.display_name }); // 4. respond
  } catch (error) {
    return handleApiError(error);
  }
}
