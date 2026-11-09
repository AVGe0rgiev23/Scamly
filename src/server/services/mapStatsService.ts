// The numbers behind the public scam map: GET /api/map/stats (task W3-01,
// BUILD_PLAN 3 #25, brief 5.2 D).
//
// The data comes only from the SQL function get_map_stats(weeks), which counts
// APPROVED reports per district, script and week. Pending and rejected reports never
// count, so spam can't reach the map before a moderator has seen it.
//
// "Scam wave" (BUILD_PLAN Q10): a script is a wave in a district when
//   (a) it has at least 5 approved reports there in the last 7 days, AND
//   (b) that is at least 2x the district's weekly average for this script over the
//       4 weeks before (the 28 days before the last 7).
// The function returns counts for a rolling window (the last 7 x weeks days), so:
//   get_map_stats(1) summed up = the exact last 7 days,
//   get_map_stats(5) summed up = the last 35 days,
//   the difference             = the exact 28 days (4 weeks) before.
// No database change was needed for this.
//
// The wave rule itself is a small pure function (isScamWave), unit-tested on its own.

import "server-only";
import { SCRIPT_TYPES, type ScriptType } from "@/engine";
import {
  DISTRICT_CODES,
  type DistrictStatsDto,
  type MapStatsDto,
  type WaveDto,
} from "@/schemas/reports";
import { fetchMapStats, type MapStatsRow } from "@/server/repositories/reportsRepository";
import type { DbClient } from "@/server/supabase/userClient";

// The numbers of Q10.
export const WAVE_MIN_REPORTS = 5;
export const WAVE_FACTOR = 2;
export const WAVE_HISTORY_WEEKS = 4;

// "unknown" is not a script but "we couldn't tell", so it never forms a wave: a
// message like „вълна от схемата Неизвестна“ would help nobody. It still counts in
// the totals.
const WAVE_SCRIPTS: ScriptType[] = SCRIPT_TYPES.filter((script) => script !== "unknown");

// What the service needs from the outside world (tests pass a fake).
export type MapStatsDeps = {
  getMapStats: (weeks: number) => Promise<MapStatsRow[]>;
};

// Q10 for one district and one script. Whole numbers only: "last >= 2 x (prev / 4)"
// is the same as "last x 4 >= 2 x prev", and that avoids rounding problems.
// With no history at all (prev = 0), 5 reports are enough.
export function isScamWave(lastSevenDays: number, previousFourWeeks: number): boolean {
  return (
    lastSevenDays >= WAVE_MIN_REPORTS &&
    lastSevenDays * WAVE_HISTORY_WEEKS >= WAVE_FACTOR * previousFourWeeks
  );
}

// The key for one district + script, e.g. "BG-02|police" (a dict key in Python could
// be a tuple; in JavaScript a Map key is compared by identity, so we use a string).
function key(districtCode: string, scriptType: string): string {
  return `${districtCode}|${scriptType}`;
}

// Adds up the weekly rows per district + script (the weeks are not needed any more).
export function sumByDistrictAndScript(rows: MapStatsRow[]): Map<string, number> {
  const sums = new Map<string, number>();
  for (const row of rows) {
    const k = key(row.district_code, row.script_type);
    sums.set(k, (sums.get(k) ?? 0) + row.report_count);
  }
  return sums;
}

// The waves of one district, from the last-7-days and last-35-days rows.
export function findWaves(
  districtCode: string,
  lastWeek: Map<string, number>,
  lastFiveWeeks: Map<string, number>,
): WaveDto[] {
  const waves: WaveDto[] = [];
  for (const scriptType of WAVE_SCRIPTS) {
    const recent = lastWeek.get(key(districtCode, scriptType)) ?? 0;
    // Never below 0 (it can't be, but the two calls run a moment apart).
    const before = Math.max(0, (lastFiveWeeks.get(key(districtCode, scriptType)) ?? 0) - recent);
    if (isScamWave(recent, before)) {
      const weeklyAverage = Math.round((before / WAVE_HISTORY_WEEKS) * 10) / 10;
      waves.push({ scriptType, lastSevenDays: recent, weeklyAverage });
    }
  }
  return waves;
}

// The whole answer, from the three sets of rows. Pure: no database, no clock.
export function buildMapStats(
  weeks: number,
  periodRows: MapStatsRow[],
  lastWeekRows: MapStatsRow[],
  lastFiveWeeksRows: MapStatsRow[],
): MapStatsDto {
  const period = sumByDistrictAndScript(periodRows);
  const lastWeek = sumByDistrictAndScript(lastWeekRows);
  const lastFiveWeeks = sumByDistrictAndScript(lastFiveWeeksRows);

  const districts: DistrictStatsDto[] = DISTRICT_CODES.map((districtCode) => {
    // Object.fromEntries turns [["police", 3], …] into { police: 3, … },
    // like dict([...]) in Python.
    const byScript = Object.fromEntries(
      SCRIPT_TYPES.map((script) => [script, period.get(key(districtCode, script)) ?? 0]),
    ) as Record<ScriptType, number>;
    const total = SCRIPT_TYPES.reduce((sum, script) => sum + byScript[script], 0);
    return {
      districtCode,
      total,
      byScript,
      waves: findWaves(districtCode, lastWeek, lastFiveWeeks),
    };
  });
  return { weeks, districts };
}

// The service: three calls to get_map_stats (run at the same time), then the pure part.
export async function getMapStats(deps: MapStatsDeps, weeks: number): Promise<MapStatsDto> {
  const [periodRows, lastWeekRows, lastFiveWeeksRows] = await Promise.all([
    deps.getMapStats(weeks),
    deps.getMapStats(1),
    deps.getMapStats(1 + WAVE_HISTORY_WEEKS),
  ]);
  return buildMapStats(weeks, periodRows, lastWeekRows, lastFiveWeeksRows);
}

// The real deps: the PUBLIC client (guest rights are enough for get_map_stats).
export function createMapStatsDeps(client: DbClient): MapStatsDeps {
  return { getMapStats: (weeks) => fetchMapStats(client, weeks) };
}
