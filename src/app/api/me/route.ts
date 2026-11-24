// GET /api/me identifies the session. DELETE /api/me deletes the family account.
// 200 { userId, role, displayName, emailAlerts, deviceId, protectedPersonId }
// deviceId and protectedPersonId are set only for a paired phone (role "protected").
// 401 for a guest, and for a phone whose pairing was revoked.

import { connection } from "next/server";
import { bg } from "@/i18n/bg";
import { z } from "@/lib/zod";
import { getActor } from "@/server/auth/actor";
import { requireRole } from "@/server/auth/requireRole";
import { handleApiError, json, unauthorized } from "@/server/http/errors";
import { readJsonBody } from "@/server/http/request";
import { deleteAuthUser } from "@/server/repositories/authUsersRepository";
import { assertSameOrigin } from "@/server/security/origin";
import { createAdminClient } from "@/server/supabase/adminClient";
import { createUserClient } from "@/server/supabase/userClient";

const deleteMeSchema = z.strictObject({
  confirm: z.literal(bg.accountData.confirmWord, { error: bg.accountData.confirmHint }),
});

export async function GET() {
  // This answer is different for every person: never build it in advance at
  // `next build` time (Cache Components would otherwise try to prerender a GET).
  await connection();
  try {
    const actor = await getActor(); // 1. who are you?
    if (actor === null) {
      throw unauthorized();
    }
    return json({
      userId: actor.userId,
      role: actor.role,
      displayName: actor.profile.display_name,
      emailAlerts: actor.profile.email_alerts,
      deviceId: actor.device === null ? null : actor.device.id,
      protectedPersonId: actor.device === null ? null : actor.device.protectedPersonId,
    });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(request: Request) {
  try {
    assertSameOrigin(request);
    const user = await createUserClient();
    const actor = await requireRole(["family"], user);
    deleteMeSchema.parse(await readJsonBody(request));
    // The database removes the owned records and paired-device accounts in this deletion.
    await deleteAuthUser(createAdminClient(), actor.userId);
    await user.auth.signOut({ scope: "local" });
    return json({ ok: true });
  } catch (error) {
    return handleApiError(error);
  }
}
