// POST /api/persons/:id/invites: an invite link for another relative to join this
// person's contact list with their own account (family, OWNER only; BUILD_PLAN 3, #12).
// Body: { displayName: "Иван", priority: 2 }
// 201 { inviteId, invitePath: "/pokana?t=<token>", expiresAt } (valid 7 days, single
// use; the token is shown only this once). Not the owner, or no such person -> 404.

import { CreateInviteSchema } from "@/schemas/invites";
import { IdParamSchema } from "@/schemas/persons";
import { requireRole } from "@/server/auth/requireRole";
import { handleApiError, json, notFound } from "@/server/http/errors";
import { readJsonBody } from "@/server/http/request";
import { assertSameOrigin } from "@/server/security/origin";
import { createInvite, createInviteDeps } from "@/server/services/inviteService";
import { createAdminClient } from "@/server/supabase/adminClient";
import { createUserClient } from "@/server/supabase/userClient";

export async function POST(request: Request, context: RouteContext<"/api/persons/[id]/invites">) {
  try {
    assertSameOrigin(request); // 0. from our own site? (CSRF)
    const client = await createUserClient();
    const actor = await requireRole(["family"], client); // 1. who are you? (401/403)
    const personId = IdParamSchema.safeParse((await context.params).id); // 2. valid id?
    if (!personId.success) {
      throw notFound();
    }
    const input = CreateInviteSchema.parse(await readJsonBody(request)); // 2. valid input?
    const deps = createInviteDeps(client, createAdminClient());
    const result = await createInvite(deps, actor, personId.data, input); // 3. owner + token
    return json(result, 201); // 4. respond
  } catch (error) {
    return handleApiError(error);
  }
}
