// Pure helpers of the scam map /karta (W3-03), no React and no Leaflet, so they are
// easy to unit-test: the colour level of a district, the legend, the "scam wave"
// texts and the Bulgarian number words.

import { fill } from "@/components/family/format";
import type { ScriptType } from "@/engine";
import { bg } from "@/i18n/bg";
import type { DistrictCode, DistrictStatsDto, MapStatsDto } from "@/schemas/reports";

// The periods the page offers (weeks); GET /api/map/stats accepts 1..12.
export const MAP_PERIODS = [1, 4, 12] as const;
export type MapPeriod = (typeof MAP_PERIODS)[number];
export const DEFAULT_PERIOD: MapPeriod = 4;

// The colour levels: fixed ranges of approved reports, so the same colour always
// means the same numbers (also when the period changes). Level 0 = no reports.
// `to: null` = "and more".
export const LEVELS = [
  { level: 0, from: 0, to: 0 },
  { level: 1, from: 1, to: 2 },
  { level: 2, from: 3, to: 5 },
  { level: 3, from: 6, to: 10 },
  { level: 4, from: 11, to: null },
] as const;

// Which colour level a district with `total` reports gets (0–4).
export function levelOf(total: number): number {
  for (const range of LEVELS) {
    if (range.to === null || total <= range.to) {
      return range.level;
    }
  }
  return 0;
}

// The text of one legend row: "0", "1–2", "3–5", "6–10", "над 10".
export function legendText(range: (typeof LEVELS)[number]): string {
  if (range.to === null) {
    return fill(bg.map.legendOver, { from: range.from - 1 });
  }
  if (range.from === range.to) {
    return String(range.from);
  }
  return fill(bg.map.legendRange, { from: range.from, to: range.to });
}

// "1 сигнал", "5 сигнала", "0 сигнала" (Bulgarian uses the singular only for 1).
export function reportsText(count: number): string {
  return fill(count === 1 ? bg.map.reportsOne : bg.map.reportsMany, { count });
}

export function districtName(code: DistrictCode): string {
  return bg.districts[code];
}

export function scriptName(script: ScriptType): string {
  return bg.scripts.typeNames[script];
}

// What screen readers say for a district on the map, and its tooltip.
export function districtLabel(district: DistrictStatsDto): string {
  return fill(bg.map.districtLabel, {
    district: districtName(district.districtCode),
    reports: reportsText(district.total),
  });
}

// One "scam wave" text per district and script:
// „Тази седмица в област Бургас: 14 сигнала за схемата „Полицай““.
// The biggest waves first; ties in district order (the API's order).
export function waveTexts(stats: MapStatsDto): string[] {
  const waves = stats.districts.flatMap((district) =>
    district.waves.map((wave) => ({ district: district.districtCode, wave })),
  );
  return waves
    .map((item, index) => ({ ...item, index }))
    .sort((a, b) => b.wave.lastSevenDays - a.wave.lastSevenDays || a.index - b.index)
    .map((item) =>
      fill(bg.map.wave, {
        district: districtName(item.district),
        count: item.wave.lastSevenDays,
        script: scriptName(item.wave.scriptType),
      }),
    );
}

// The scripts of one district with at least one report, the most frequent first
// (for the district panel).
export function scriptCounts(district: DistrictStatsDto): { script: ScriptType; count: number }[] {
  return (Object.entries(district.byScript) as [ScriptType, number][])
    .filter(([, count]) => count > 0)
    .sort((a, b) => b[1] - a[1])
    .map(([script, count]) => ({ script, count }));
}
