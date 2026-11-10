// Unit tests for the scam map's pure helpers (mapData.ts, W3-03).

import { describe, expect, it } from "vitest";
import { bg } from "@/i18n/bg";
import { DISTRICT_CODES, type DistrictStatsDto, type MapStatsDto } from "@/schemas/reports";
import {
  districtLabel,
  legendText,
  LEVELS,
  levelOf,
  reportsText,
  scriptCounts,
  waveTexts,
} from "./mapData";

function district(code: DistrictStatsDto["districtCode"], fields: Partial<DistrictStatsDto> = {}) {
  return {
    districtCode: code,
    total: 0,
    byScript: { police: 0, relative_in_trouble: 0, fake_official: 0, courier: 0, unknown: 0 },
    waves: [],
    ...fields,
  };
}

function stats(districts: DistrictStatsDto[]): MapStatsDto {
  const byCode = new Map(districts.map((one) => [one.districtCode, one]));
  return { weeks: 4, districts: DISTRICT_CODES.map((code) => byCode.get(code) ?? district(code)) };
}

describe("colour levels and legend", () => {
  it("fixed ranges 0 / 1–2 / 3–5 / 6–10 / over 10", () => {
    expect([0, 1, 2, 3, 5, 6, 10, 11, 500].map(levelOf)).toEqual([0, 1, 1, 2, 2, 3, 3, 4, 4]);
    expect(LEVELS.map(legendText)).toEqual(["0", "1–2", "3–5", "6–10", "над 10"]);
  });

  it("Bulgarian number words: 1 сигнал, otherwise сигнала", () => {
    expect(reportsText(1)).toBe("1 сигнал");
    expect(reportsText(0)).toBe("0 сигнала");
    expect(reportsText(14)).toBe("14 сигнала");
    expect(districtLabel(district("BG-02", { total: 3 }))).toBe("Бургас: 3 сигнала");
  });
});

describe("waveTexts", () => {
  it("one text per wave, the biggest first, in the words of the brief", () => {
    const texts = waveTexts(
      stats([
        district("BG-03", {
          waves: [{ scriptType: "courier", lastSevenDays: 6, weeklyAverage: 1 }],
        }),
        district("BG-02", {
          waves: [{ scriptType: "police", lastSevenDays: 14, weeklyAverage: 2.5 }],
        }),
      ]),
    );
    expect(texts).toEqual([
      "Тази седмица в област Бургас: 14 сигнала за схемата „Полицай“",
      "Тази седмица в област Варна: 6 сигнала за схемата „Колет или куриер“",
    ]);
  });

  it("no waves -> no texts (the page then says „Няма вълни…“)", () => {
    expect(waveTexts(stats([district("BG-02", { total: 4 })]))).toEqual([]);
    expect(bg.map.noWaves).toContain("Няма вълни");
  });
});

describe("scriptCounts", () => {
  it("only scripts with reports, the most frequent first", () => {
    expect(
      scriptCounts(
        district("BG-16", {
          total: 5,
          byScript: { police: 1, relative_in_trouble: 3, fake_official: 0, courier: 0, unknown: 1 },
        }),
      ),
    ).toEqual([
      { script: "relative_in_trouble", count: 3 },
      { script: "police", count: 1 },
      { script: "unknown", count: 1 },
    ]);
  });
});
