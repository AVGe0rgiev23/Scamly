// POST /api/auth/register: create a family account (guest, rate-limited per IP).
// Body: { email, password (10–72 characters), displayName (1–60) }.
// 201 { role, displayName, needsEmailConfirmation }. When "Confirm email" is off in
// Supabase, the person is logged in right away (session cookies on this response).

import { RegisterSchema } from "@/schemas/auth";
import { handleApiError, json } from "@/server/http/errors";
import { getClientIp, readJsonBody } from "@/server/http/request";
import { assertSameOrigin } from "@/server/security/origin";
import { enforceIpRateLimit, RATE_LIMITS } from "@/server/security/rateLimit";
import { register, supabaseAuthGateway } from "@/server/services/authService";
import { createUserClient } from "@/server/supabase/userClient";

export async function POST(request: Request) {
  try {
    assertSameOrigin(request); // 0. from our own site? (CSRF)
    await enforceIpRateLimit(RATE_LIMITS.registerPerIp, getClientIp(request)); // 1. not too many tries?
    const input = RegisterSchema.parse(await readJsonBody(request)); // 2. valid input? (400)
    const client = await createUserClient();
    const result = await register(supabaseAuthGateway(client), input); // 3. create the account
    return json(
      {
        role: "family",
        displayName: input.displayName,
        needsEmailConfirmation: result.needsEmailConfirmation,
      },
      201,
    ); // 4. respond
  } catch (error) {
    return handleApiError(error);
  }
}
