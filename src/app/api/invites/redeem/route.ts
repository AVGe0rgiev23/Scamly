// POST /api/invites/redeem: accept an invite and become a trusted contact of a
// protected person (any logged-in FAMILY member; BUILD_PLAN 3, #13).
// Body: { token } (from the link /pokana?t=<token>)
// 200 { protectedPersonId, personName, priority }: from now on the caller sees the
// person and gets their alerts.
// 400 „Поканата е грешна, изтекла или вече е използвана.“ (the same for all three),
// 409 for the owner's own invite, when already in the list, or when the list is full,
// 429 after 10 tries per 15 minutes from one IP.

import { requireRole } from "@/server/auth/requireRole";
import { handleApiError, json } from "@/server/http/errors";
import { getClientIp, readJsonBody } from "@/server/http/request";
import { assertSameOrigin } from "@/server/security/origin";
import { createInviteDeps, redeemInvite } from "@/server/services/inviteService";
import { createAdminClient } from "@/server/supabase/adminClient";
import { createUserClient } from "@/server/supabase/userClient";

export async function POST(request: Request) {
  try {
    assertSameOrigin(request); // 0. from our own site? (CSRF)
    const client = await createUserClient();
    const actor = await requireRole(["family"], client); // 1. who are you? (401/403)
    const body = await readJsonBody(request);
    const deps = createInviteDeps(client, createAdminClient());
    // 2–3. rate limit, input check, checks, atomic use of the invite, add the contact
    const result = await redeemInvite(deps, actor, body, getClientIp(request));
    return json(result); // 4. respond
  } catch (error) {
    return handleApiError(error);
  }
}
