// Unit tests for the scam map numbers and the "scam wave" rule (mapStatsService.ts,
// GET /api/map/stats, W3-01, BUILD_PLAN Q10). No database: rows are written by hand.

import { describe, expect, it } from "vitest";
import type { MapStatsRow } from "@/server/repositories/reportsRepository";
import {
  buildMapStats,
  getMapStats,
  isScamWave,
  type MapStatsDeps,
} from "@/server/services/mapStatsService";

// One row of get_map_stats() (the week doesn't matter for our sums).
function row(
  district_code: string,
  script_type: MapStatsRow["script_type"],
  report_count: number,
  week_start = "2026-11-02",
): MapStatsRow {
  return { district_code, script_type, week_start, report_count };
}

describe("isScamWave (Q10)", () => {
  it("needs at least 5 reports in the last 7 days", () => {
    expect(isScamWave(5, 0)).toBe(true); // exactly 5
    expect(isScamWave(4, 0)).toBe(false);
  });

  it("with zero history, 5 reports are a wave", () => {
    expect(isScamWave(5, 0)).toBe(true);
    expect(isScamWave(0, 0)).toBe(false);
  });

  it("needs at least 2x the weekly average of the 4 weeks before", () => {
    // 20 in 4 weeks = 5 per week; 2x = 10.
    expect(isScamWave(10, 20)).toBe(true); // exactly 2x
    expect(isScamWave(9, 20)).toBe(false); // less than 2x
    // 10 in 4 weeks = 2.5 per week; 2x = 5 (no rounding problems).
    expect(isScamWave(5, 10)).toBe(true);
    expect(isScamWave(5, 11)).toBe(false);
  });
});

describe("buildMapStats", () => {
  it("lists all 28 districts with totals per script, zeros included", () => {
    const stats = buildMapStats(
      4,
      [
        row("BG-02", "police", 3),
        row("BG-02", "police", 2, "2026-10-26"),
        row("BG-02", "courier", 1),
      ],
      [],
      [],
    );

    expect(stats.weeks).toBe(4);
    expect(stats.districts).toHaveLength(28);
    const burgas = stats.districts.find((d) => d.districtCode === "BG-02");
    expect(burgas).toEqual({
      districtCode: "BG-02",
      total: 6,
      byScript: { police: 5, relative_in_trouble: 0, fake_official: 0, courier: 1, unknown: 0 },
      waves: [],
    });
    const varna = stats.districts.find((d) => d.districtCode === "BG-03");
    expect(varna?.total).toBe(0);
  });

  it("flags a wave per district + script from the last 7 days vs the 4 weeks before", () => {
    const lastWeek = [row("BG-02", "police", 6), row("BG-03", "police", 6)];
    // Last 35 days = the last 7 days + the 28 days before.
    const lastFiveWeeks = [
      row("BG-02", "police", 6), // Бургас: nothing before -> wave
      row("BG-03", "police", 6),
      row("BG-03", "police", 20, "2026-10-12"), // Варна: 5 per week before -> 6 < 10, no wave
    ];

    const stats = buildMapStats(4, [], lastWeek, lastFiveWeeks);

    const burgas = stats.districts.find((d) => d.districtCode === "BG-02");
    expect(burgas?.waves).toEqual([{ scriptType: "police", lastSevenDays: 6, weeklyAverage: 0 }]);
    const varna = stats.districts.find((d) => d.districtCode === "BG-03");
    expect(varna?.waves).toEqual([]);
  });

  it("reports the weekly average with one decimal", () => {
    const stats = buildMapStats(
      4,
      [],
      [row("BG-16", "courier", 7)],
      [row("BG-16", "courier", 7), row("BG-16", "courier", 10, "2026-10-19")],
    );

    const plovdiv = stats.districts.find((d) => d.districtCode === "BG-16");
    expect(plovdiv?.waves).toEqual([
      { scriptType: "courier", lastSevenDays: 7, weeklyAverage: 2.5 },
    ]);
  });

  it("never flags 'unknown' as a wave (it is not a script)", () => {
    const stats = buildMapStats(4, [], [row("BG-22", "unknown", 9)], [row("BG-22", "unknown", 9)]);

    expect(stats.districts.find((d) => d.districtCode === "BG-22")?.waves).toEqual([]);
  });
});

describe("getMapStats", () => {
  it("asks get_map_stats for the period, the last week and the last 5 weeks", async () => {
    const asked: number[] = [];
    const deps: MapStatsDeps = {
      getMapStats: async (weeks) => {
        asked.push(weeks);
        return weeks === 1 ? [row("BG-02", "police", 5)] : [row("BG-02", "police", 5)];
      },
    };

    const stats = await getMapStats(deps, 8);

    expect(asked.sort((a, b) => a - b)).toEqual([1, 5, 8]);
    const burgas = stats.districts.find((d) => d.districtCode === "BG-02");
    expect(burgas?.total).toBe(5);
    expect(burgas?.waves).toHaveLength(1);
  });
});
