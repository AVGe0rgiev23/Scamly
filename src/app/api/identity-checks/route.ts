// /api/identity-checks („Провери истинския“, D34, task P-05, BUILD_PLAN 5b)
//   POST { claimedUserId, askedUserId? } -> 201 { identityCheck }: the protected phone
//          asks a real family member (push + live alert to them). claimedUserId = who
//          the caller pretends to be; askedUserId = who is asked (left out = the
//          claimed person: „Ти ли си?“). Phone only (role "protected"). Asking the
//          next family member after 45 s is simply another POST with the same
//          claimedUserId and the next askedUserId: the phone's previous pending
//          question becomes "expired".
//          400 not_family, 409 identity_busy, 429 after 20 questions per hour.
//   GET  -> 200 { pending, warnings }: a family member's open questions (asked to
//          them, still answerable) and the „Не съм аз“ warnings of the rest of the
//          family in the last 24 hours. Family only.

import { connection } from "next/server";
import { CreateIdentityCheckSchema } from "@/schemas/identityChecks";
import { requireRole } from "@/server/auth/requireRole";
import { handleApiError, json } from "@/server/http/errors";
import { readJsonBody } from "@/server/http/request";
import { assertSameOrigin } from "@/server/security/origin";
import {
  askFamilyMember,
  createIdentityCheckDeps,
  listMyIdentityChecks,
} from "@/server/services/identityCheckService";
import { createAdminClient } from "@/server/supabase/adminClient";
import { createUserClient } from "@/server/supabase/userClient";

export async function POST(request: Request) {
  try {
    assertSameOrigin(request); // 0. from our own site? (CSRF)
    const client = await createUserClient();
    const actor = await requireRole(["protected"], client); // 1. who are you? (401/403)
    const input = CreateIdentityCheckSchema.parse(await readJsonBody(request)); // 2. valid? (400)
    const deps = createIdentityCheckDeps(client, createAdminClient());
    const identityCheck = await askFamilyMember(deps, actor, input); // 3. rules + RLS insert + push
    return json({ identityCheck }, 201); // 4. respond
  } catch (error) {
    return handleApiError(error);
  }
}

export async function GET() {
  // Different for every person: never build it in advance at `next build` time.
  await connection();
  try {
    const client = await createUserClient();
    const actor = await requireRole(["family"], client); // 1. who are you? (401/403)
    const deps = createIdentityCheckDeps(client, createAdminClient());
    const result = await listMyIdentityChecks(deps, actor); // 2. RLS: my persons only
    return json(result); // 3. respond
  } catch (error) {
    return handleApiError(error);
  }
}
