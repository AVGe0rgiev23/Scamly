// POST /api/auth/logout: end the session in THIS browser (other devices of the same
// person stay logged in: scope "local"). Clears the session cookies. 200 { ok: true }.

import { handleApiError, json } from "@/server/http/errors";
import { assertSameOrigin } from "@/server/security/origin";
import { createUserClient } from "@/server/supabase/userClient";

export async function POST(request: Request) {
  try {
    assertSameOrigin(request); // 0. from our own site? (CSRF)
    const client = await createUserClient();
    // A guest has no session to end; that is not an error, so we ignore the result.
    await client.auth.signOut({ scope: "local" });
    return json({ ok: true });
  } catch (error) {
    return handleApiError(error);
  }
}
