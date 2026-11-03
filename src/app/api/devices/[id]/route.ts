// DELETE /api/devices/:id: remove (revoke) a paired phone, e.g. a lost one
// (family, OWNER of the protected person only; BUILD_PLAN 3, #16 and section 5).
// The phone's account is deleted, so its next request gets 401. 200 { ok: true }.
// Not the owner, or no such device -> 404.

import { IdParamSchema } from "@/schemas/persons";
import { requireRole } from "@/server/auth/requireRole";
import { handleApiError, json, notFound } from "@/server/http/errors";
import { assertSameOrigin } from "@/server/security/origin";
import { createPairingDeps, revokeDevice } from "@/server/services/pairingService";
import { createAdminClient } from "@/server/supabase/adminClient";
import { createUserClient } from "@/server/supabase/userClient";

export async function DELETE(request: Request, context: RouteContext<"/api/devices/[id]">) {
  try {
    assertSameOrigin(request); // 0. from our own site? (CSRF)
    const client = await createUserClient();
    const actor = await requireRole(["family"], client); // 1. who are you? (401/403)
    const { id } = await context.params;
    const deviceId = IdParamSchema.safeParse(id); // 2. valid id? (else 404)
    if (!deviceId.success) {
      throw notFound();
    }
    const deps = createPairingDeps(client, createAdminClient());
    await revokeDevice(deps, actor, deviceId.data); // 3. owner check + delete the account
    return json({ ok: true }); // 4. respond
  } catch (error) {
    return handleApiError(error);
  }
}
