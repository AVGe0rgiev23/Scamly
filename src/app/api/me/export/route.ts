// Download the signed-in family member's data as a private JSON attachment.
import { connection } from "next/server";
import { requireRole } from "@/server/auth/requireRole";
import { handleApiError, unauthorized } from "@/server/http/errors";
import { assertSameOriginRead } from "@/server/security/origin";
import { exportFamilyData } from "@/server/services/accountExport";
import { createUserClient } from "@/server/supabase/userClient";

export async function GET(request: Request) {
  await connection();
  try {
    assertSameOriginRead(request);
    const client = await createUserClient();
    const actor = await requireRole(["family"], client);
    const { data, error } = await client.auth.getUser();
    if (error || data.user?.id !== actor.userId) throw unauthorized();
    return Response.json(await exportFamilyData(client, actor.userId, data.user.email ?? null), {
      headers: {
        "Cache-Control": "no-store",
        "Content-Disposition": 'attachment; filename="scamly-data.json"',
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
