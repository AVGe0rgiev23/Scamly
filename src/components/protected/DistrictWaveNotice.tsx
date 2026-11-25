// Shows the strongest active scam wave for the paired phone's district.
import { unstable_rethrow } from "next/navigation";
import { fill } from "@/components/family/format";
import { districtName, scriptName } from "@/components/map/mapData";
import { Notice } from "@/components/ui/Notice";
import { bg } from "@/i18n/bg";
import { DISTRICT_CODES } from "@/schemas/reports";
import { getActor } from "@/server/auth/actor";
import { findPersonById } from "@/server/repositories/personsRepository";
import { createMapStatsDeps, getDistrictWave } from "@/server/services/mapStatsService";
import { createPublicClient } from "@/server/supabase/publicClient";
import { createUserClient } from "@/server/supabase/userClient";

async function loadDistrictWave() {
  try {
    const user = await createUserClient();
    const actor = await getActor(user);
    if (actor?.role !== "protected" || actor.device === null) return null;

    const person = await findPersonById(user, actor.device.protectedPersonId);
    const district = DISTRICT_CODES.find((code) => code === person?.district_code);
    if (district === undefined) return null;

    const wave = await getDistrictWave(createMapStatsDeps(createPublicClient()), district);
    return wave === null ? null : { district, wave };
  } catch (error) {
    unstable_rethrow(error);
    // A failed optional lookup must never interrupt the call check.
    return null;
  }
}

export async function DistrictWaveNotice() {
  const active = await loadDistrictWave();
  if (active === null) return null;

  const { district, wave } = active;
  return (
    <Notice title={fill(bg.protectedCheck.waveTitle, { district: districtName(district) })}>
      <p className="mt-1">
        {fill(bg.protectedCheck.waveReports, {
          count: wave.lastSevenDays,
          script: scriptName(wave.scriptType),
        })}
      </p>
      <p className="mt-1">{bg.protectedCheck.waveAdvice}</p>
    </Notice>
  );
}
