// POST /api/pairing/redeem: the older person's phone sends the 6-digit code
// (guest; BUILD_PLAN 3, #15 and section 5).
// Body: { code: "482915", label?: "Телефонът на баба" }
// 200 { role: "protected", displayName, deviceId, protectedPersonId } + the session
// cookies (HttpOnly, Secure, SameSite=Lax), so the phone is logged in from now on.
// 400 „Кодът е грешен или е изтекъл.“ for a wrong, expired or used code (same text),
// 429 after 5 tries per 15 minutes from one IP (or 100 from everybody).

import { handleApiError, json } from "@/server/http/errors";
import { getClientIp, readJsonBody } from "@/server/http/request";
import { assertSameOrigin } from "@/server/security/origin";
import { createPairingDeps, redeemPairingCode } from "@/server/services/pairingService";
import { createAdminClient } from "@/server/supabase/adminClient";
import { createUserClient } from "@/server/supabase/userClient";

export async function POST(request: Request) {
  try {
    assertSameOrigin(request); // 0. from our own site? (CSRF)
    const body = await readJsonBody(request);
    // The user client signs the phone in, which writes the cookies on this response.
    const deps = createPairingDeps(await createUserClient(), createAdminClient());
    // 1–3. rate limits, input check, atomic code check, device account + session
    const result = await redeemPairingCode(deps, body, getClientIp(request));
    return json({ role: "protected", ...result }); // 4. respond
  } catch (error) {
    return handleApiError(error);
  }
}
