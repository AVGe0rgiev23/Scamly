// GET /api/me: who am I? (any logged-in role; BUILD_PLAN 3, #2)
// 200 { userId, role, displayName, emailAlerts, deviceId, protectedPersonId }
// deviceId and protectedPersonId are set only for a paired phone (role "protected").
// 401 for a guest, and for a phone whose pairing was revoked.

import { connection } from "next/server";
import { getActor } from "@/server/auth/actor";
import { handleApiError, json, unauthorized } from "@/server/http/errors";

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
