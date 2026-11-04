// GET /api/realtime/token: the caller's short-lived access token, for Supabase
// Realtime in the browser (task W2-03). Any logged-in role (family, phone, moderator,
// admin). 200 { userId, accessToken, expiresAt }, never cached ("no-store").
// Only for our own pages: a request started by another site gets 403.
// Why a page may see this token, and why that is acceptable: see realtimeService.ts.

import { connection } from "next/server";
import { requireRole } from "@/server/auth/requireRole";
import { handleApiError, json } from "@/server/http/errors";
import { assertSameOriginRead } from "@/server/security/origin";
import { issueRealtimeToken } from "@/server/services/realtimeService";
import { createUserClient } from "@/server/supabase/userClient";

export async function GET(request: Request) {
  await connection();
  try {
    assertSameOriginRead(request); // 0. from our own site? (a secret, so GET is checked too)
    const client = await createUserClient();
    // 1. who are you? getUser() asks the Auth server, so a deleted account is refused.
    const actor = await requireRole(["family", "protected", "moderator", "admin"], client);
    // 2. the session in the cookies (the proxy has already refreshed an old token)
    const { data } = await client.auth.getSession();
    const session =
      data.session === null
        ? null
        : {
            userId: data.session.user.id,
            accessToken: data.session.access_token,
            expiresAt: data.session.expires_at,
          };
    return json(issueRealtimeToken(actor, session)); // 3–4. same account? respond
  } catch (error) {
    return handleApiError(error);
  }
}
