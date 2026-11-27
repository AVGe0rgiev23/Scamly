// The district of the person whose phone this is (server only). Used by the
// district warning on the home screen (#25) and by „Изпратете анонимно на картата“
// on the red screens (P-11). null for anything but a paired phone, or on any error:
// both features are optional and must never stop the call check.
import "server-only";
import { unstable_rethrow } from "next/navigation";
import { DISTRICT_CODES, type DistrictCode } from "@/schemas/reports";
import { getActor } from "@/server/auth/actor";
import { findPersonById } from "@/server/repositories/personsRepository";
import { createUserClient } from "@/server/supabase/userClient";

export async function loadPairedDistrict(): Promise<DistrictCode | null> {
  try {
    const user = await createUserClient();
    const actor = await getActor(user);
    if (actor?.role !== "protected" || actor.device === null) return null;
    // The phone may read its own person (RLS), so the user client is enough.
    const person = await findPersonById(user, actor.device.protectedPersonId);
    return DISTRICT_CODES.find((code) => code === person?.district_code) ?? null;
  } catch (error) {
    unstable_rethrow(error);
    return null;
  }
}
