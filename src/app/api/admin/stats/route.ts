// GET /api/admin/stats?days=7..90: the numbers behind the admin's charts (task W3-06,
// BUILD_PLAN 3 #34). Admin only. Missing `days` = 30.
//   200 { days, from, to, checksPerDay, checksByLevel, checksByScript,
//         reportsByDistrict (top 10), reportsByStatus, totals, partial }
//   400 days out of range, 401 / 403 not logged in / not an admin

import { connection } from "next/server";
import { requireRole } from "@/server/auth/requireRole";
import { handleApiError, json } from "@/server/http/errors";
import { createAdminDeps, getStats } from "@/server/services/adminService";
import { createAdminClient } from "@/server/supabase/adminClient";
import { createUserClient } from "@/server/supabase/userClient";

export async function GET(request: Request) {
  await connection();
  try {
    const client = await createUserClient();
    await requireRole(["admin"], client); // 401 / 403
    const days = new URL(request.url).searchParams.get("days") ?? undefined;
    const stats = await getStats(createAdminDeps(client, createAdminClient), { days });
    return json(stats);
  } catch (error) {
    return handleApiError(error);
  }
}
