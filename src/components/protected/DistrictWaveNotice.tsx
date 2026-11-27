// Shows the strongest active scam wave for the paired phone's district.
import { unstable_rethrow } from "next/navigation";
import { fill } from "@/components/family/format";
import { districtName, scriptName } from "@/components/map/mapData";
import { Notice } from "@/components/ui/Notice";
import { bg } from "@/i18n/bg";
import { createMapStatsDeps, getDistrictWave } from "@/server/services/mapStatsService";
import { createPublicClient } from "@/server/supabase/publicClient";
import { loadPairedDistrict } from "./pairedDistrict";

async function loadDistrictWave() {
  const district = await loadPairedDistrict();
  if (district === null) return null;
  try {
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
