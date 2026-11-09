// /api/scripts: the scam-script library, the education cards „Как работи измамата“
// (BUILD_PLAN 3, #26 and #30; task W3-05).
//
// GET /api/scripts            anyone, no login
//   200 { scripts: [{ slug, scriptType, titleBg, howItStartsBg, whatTheySayBg, whatToDoBg }] }
//       only PUBLISHED cards, ordered by script type, then title. The CDN may keep the
//       answer for 60 s (the same for everybody), like GET /api/map/stats.
// GET /api/scripts?all=1      moderator or admin: every card, also drafts, with id,
//   200 { scripts: [...] }    extraKeywords, published and updatedAt (for the editor)
//   401 / 403                 not logged in / another role
// POST /api/scripts           moderator or admin: a new card (audited "script_created")
//   201 { script }            400 invalid input, 403 from another site or wrong role,
//                             409 the slug is taken

import { connection } from "next/server";
import { requireRole } from "@/server/auth/requireRole";
import { handleApiError, json } from "@/server/http/errors";
import { readJsonBody } from "@/server/http/request";
import { assertSameOrigin } from "@/server/security/origin";
import {
  createScript,
  createScriptDeps,
  listAllScripts,
  listPublicScripts,
} from "@/server/services/scriptService";
import { createAdminClient } from "@/server/supabase/adminClient";
import { createPublicClient } from "@/server/supabase/publicClient";
import { createUserClient } from "@/server/supabase/userClient";

const PUBLIC_CACHE_CONTROL = "public, max-age=0, s-maxage=60";

export async function GET(request: Request) {
  // Wait for a real request: never build this answer once at `next build` time.
  await connection();
  try {
    const url = new URL(request.url);
    if (url.searchParams.get("all") === "1") {
      // The editor's list: the moderator's own client, so RLS also shows the drafts.
      const client = await createUserClient();
      await requireRole(["moderator", "admin"], client); // 401 / 403
      const result = await listAllScripts(createScriptDeps(client, createAdminClient));
      return json(result); // private: "no-store"
    }
    // Everybody: the public client (a guest for RLS, no cookies), published cards only.
    const result = await listPublicScripts(
      createScriptDeps(createPublicClient(), createAdminClient),
    );
    return Response.json(result, { headers: { "Cache-Control": PUBLIC_CACHE_CONTROL } });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: Request) {
  try {
    assertSameOrigin(request); // 0. from our own site? (CSRF)
    const client = await createUserClient();
    const actor = await requireRole(["moderator", "admin"], client); // 1. who? (401/403)
    const body = await readJsonBody(request);
    // 2–4. Zod, insert with the moderator's client (RLS), audit line
    const script = await createScript(createScriptDeps(client, createAdminClient), actor, body);
    return json({ script }, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
