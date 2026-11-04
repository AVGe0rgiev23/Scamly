// /api/checks (BUILD_PLAN 3, #17 and #21)
//   POST -> 201 { checkId }: the older person's phone pressed the big button
//           („Обаждат ми се за пари!“). Creates the check and alerts the family at
//           once. Phone only (role "protected"); 429 after 10 checks per hour.
//   GET  ?personId=…&cursor=… -> 200 { checks: [...], nextCursor }: the history of one
//           person, newest first, 20 per page (family with access; else 404).

import { connection } from "next/server";
import { ListChecksQuerySchema } from "@/schemas/checks";
import { requireRole } from "@/server/auth/requireRole";
import { handleApiError, json } from "@/server/http/errors";
import { assertSameOrigin } from "@/server/security/origin";
import { createCheckDeps, listChecks, startCheck } from "@/server/services/checkService";
import { createAdminClient } from "@/server/supabase/adminClient";
import { createUserClient } from "@/server/supabase/userClient";

export async function POST(request: Request) {
  try {
    assertSameOrigin(request); // 0. from our own site? (CSRF)
    const client = await createUserClient();
    const actor = await requireRole(["protected"], client); // 1. who are you? (401/403)
    // 2. no input: the person comes from the phone's own pairing, never from the body
    const deps = createCheckDeps(client, createAdminClient());
    const result = await startCheck(deps, actor); // 3. rate limit, create, alert family
    return json(result, 201); // 4. respond
  } catch (error) {
    return handleApiError(error);
  }
}

export async function GET(request: Request) {
  // Different for every person: never build it in advance at `next build` time.
  await connection();
  try {
    const client = await createUserClient();
    await requireRole(["family"], client); // 1. who are you? (401/403)
    // 2. valid query? searchParams is like Python's urllib.parse.parse_qs
    const url = new URL(request.url);
    const query = ListChecksQuerySchema.parse({
      personId: url.searchParams.get("personId") ?? undefined,
      cursor: url.searchParams.get("cursor") ?? undefined,
    });
    const deps = createCheckDeps(client, createAdminClient());
    const result = await listChecks(deps, query); // 3. RLS: only persons I have access to
    return json(result); // 4. respond
  } catch (error) {
    return handleApiError(error);
  }
}
