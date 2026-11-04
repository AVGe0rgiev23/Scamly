// POST /api/checks/:id/acknowledge: the family member's „Обаждам ѝ се сега“
// (BUILD_PLAN 3, #20; task W2-04). Family with access to the person.
// The first family member to press wins; the older person's phone then shows
// „Иван ще ви се обади веднага.“ 200 { checkId, first, acknowledgement }.
// No access, or no such check -> 404.

import { IdParamSchema } from "@/schemas/persons";
import { requireRole } from "@/server/auth/requireRole";
import { handleApiError, json, notFound } from "@/server/http/errors";
import { assertSameOrigin } from "@/server/security/origin";
import { acknowledge, createCheckDeps } from "@/server/services/checkService";
import { createAdminClient } from "@/server/supabase/adminClient";
import { createUserClient } from "@/server/supabase/userClient";

export async function POST(
  request: Request,
  context: RouteContext<"/api/checks/[id]/acknowledge">,
) {
  try {
    assertSameOrigin(request); // 0. from our own site? (CSRF)
    const client = await createUserClient();
    const actor = await requireRole(["family"], client); // 1. who are you? (401/403)
    const { id } = await context.params;
    const checkId = IdParamSchema.safeParse(id); // 2. valid id? (else 404)
    if (!checkId.success) {
      throw notFound();
    }
    const deps = createCheckDeps(client, createAdminClient());
    const result = await acknowledge(deps, actor, checkId.data); // 3. RLS check, then write
    return json(result); // 4. respond
  } catch (error) {
    return handleApiError(error);
  }
}
