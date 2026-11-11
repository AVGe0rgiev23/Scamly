// Scheduled request from Supabase Cron to notify the next trusted contact.
import { createHash, timingSafeEqual } from "node:crypto";
import { getFeatures } from "@/config/features";
import { handleApiError, json, unauthorized } from "@/server/http/errors";
import { escalateAlerts, getEscalationSecret } from "@/server/services/alertService";
import { createAdminClient } from "@/server/supabase/adminClient";

function digest(value: string) {
  return createHash("sha256").update(value).digest();
}

export async function POST(request: Request) {
  try {
    const secret = getEscalationSecret();
    const authorization = request.headers.get("authorization");
    if (
      secret === undefined ||
      authorization === null ||
      !timingSafeEqual(digest(authorization), digest(`Bearer ${secret}`))
    ) {
      throw unauthorized();
    }
    if (!getFeatures().escalation) return json({ dispatched: 0 });
    return json({ dispatched: await escalateAlerts(createAdminClient()) });
  } catch (error) {
    return handleApiError(error);
  }
}
