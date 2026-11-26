// GET /api/identity-checks/family („Провери истинския“, D34, task P-05)
// -> 200 { people: [{ userId, displayName, initials, phone, priority, canReceive }] }
// The protected phone's family tiles („Казва, че е Иван“), in calling order, with the
// SAVED phone numbers for the call-back button. canReceive = has a Scamly account, so
// userId can be sent as claimedUserId to POST /api/identity-checks. Phone only.

import { connection } from "next/server";
import { requireRole } from "@/server/auth/requireRole";
import { handleApiError, json } from "@/server/http/errors";
import {
  createIdentityCheckDeps,
  listFamilyForPhone,
} from "@/server/services/identityCheckService";
import { createAdminClient } from "@/server/supabase/adminClient";
import { createUserClient } from "@/server/supabase/userClient";

export async function GET() {
  await connection();
  try {
    const client = await createUserClient();
    const actor = await requireRole(["protected"], client); // 1. who are you? (401/403)
    const deps = createIdentityCheckDeps(client, createAdminClient());
    const result = await listFamilyForPhone(deps, actor); // 2. RLS: its own person only
    return json(result); // 3. respond
  } catch (error) {
    return handleApiError(error);
  }
}
