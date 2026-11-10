// Unit tests for the pure statistics helpers of the admin area (adminStats.ts, W3-06).

import { describe, expect, it } from "vitest";
import type { StatsCheckRow, StatsReportRow } from "@/server/repositories/adminRepository";
import { dayInBulgaria, daysBetween, shapeStats, statsPeriod } from "@/server/services/adminStats";

const NOW = new Date("2026-11-09T10:00:00Z");

function check(
  startedAt: string,
  level: StatsCheckRow["risk_level"],
  script: StatsCheckRow["script_type"] = null,
): StatsCheckRow {
  return { started_at: startedAt, risk_level: level, script_type: script };
}
function report(
  submittedAt: string,
  district: string,
  status: StatsReportRow["status"],
): StatsReportRow {
  return { submitted_at: submittedAt, district_code: district, status };
}

describe("statsPeriod and days", () => {
  it("7 days end today in Bulgaria and read from the day before", () => {
    expect(statsPeriod(NOW, 7)).toEqual({
      days: 7,
      from: "2026-11-03",
      to: "2026-11-09",
      sinceIso: "2026-11-02T00:00:00.000Z",
    });
    // 23:30 UTC is already the next day in Sofia (UTC+2 in November).
    expect(statsPeriod(new Date("2026-11-09T23:30:00Z"), 7).to).toBe("2026-11-10");
  });

  it("days are Sofia calendar days, every day of the period is listed", () => {
    expect(dayInBulgaria("2026-11-08T22:30:00Z")).toBe("2026-11-09");
    expect(dayInBulgaria("2026-11-08T21:59:00Z")).toBe("2026-11-08");
    expect(daysBetween("2026-10-30", "2026-11-02")).toEqual([
      "2026-10-30",
      "2026-10-31",
      "2026-11-01",
      "2026-11-02",
    ]);
  });
});

describe("shapeStats", () => {
  const period = statsPeriod(NOW, 7);

  it("counts checks per day by level, with zero days, and drops rows outside the period", () => {
    const stats = shapeStats({
      period,
      partial: false,
      checks: [
        check("2026-11-09T08:00:00Z", "red", "police"),
        check("2026-11-09T09:00:00Z", "red", "police"),
        check("2026-11-08T22:30:00Z", "yellow", "courier"), // 00:30 on 9 Nov in Sofia
        check("2026-11-03T06:00:00Z", "green", "unknown"),
        check("2026-11-05T06:00:00Z", null), // started, never answered
        check("2026-11-02T12:00:00Z", "red", "police"), // the extra day: not counted
      ],
      reports: [],
    });
    expect(stats.checksPerDay).toHaveLength(7);
    expect(stats.checksPerDay[0]).toEqual({
      date: "2026-11-03",
      red: 0,
      yellow: 0,
      green: 1,
      unfinished: 0,
    });
    expect(stats.checksPerDay[2]).toEqual({
      date: "2026-11-05",
      red: 0,
      yellow: 0,
      green: 0,
      unfinished: 1,
    });
    expect(stats.checksPerDay[6]).toEqual({
      date: "2026-11-09",
      red: 2,
      yellow: 1,
      green: 0,
      unfinished: 0,
    });
    expect(stats.checksByLevel).toEqual({ red: 2, yellow: 1, green: 1, unfinished: 1 });
    expect(stats.totals.checks).toBe(5);
    // Script types: answered checks only, all 5 types in the enum's order.
    expect(stats.checksByScript).toEqual([
      { scriptType: "police", count: 2 },
      { scriptType: "relative_in_trouble", count: 0 },
      { scriptType: "fake_official", count: 0 },
      { scriptType: "courier", count: 1 },
      { scriptType: "unknown", count: 1 },
    ]);
  });

  it("reports: top 10 districts by total (ties by code), statuses, totals", () => {
    const reports: StatsReportRow[] = [];
    // BG-01 … BG-12 with 1 report each, BG-22 with 3 (2 approved, 1 pending), BG-02 with 2.
    for (let i = 1; i <= 12; i += 1) {
      reports.push(report("2026-11-05T10:00:00Z", `BG-${String(i).padStart(2, "0")}`, "rejected"));
    }
    reports.push(report("2026-11-05T10:00:00Z", "BG-22", "approved"));
    reports.push(report("2026-11-06T10:00:00Z", "BG-22", "approved"));
    reports.push(report("2026-11-07T10:00:00Z", "BG-22", "pending"));
    reports.push(report("2026-11-07T10:00:00Z", "BG-02", "pending"));
    reports.push(report("2026-11-01T10:00:00Z", "BG-28", "approved")); // before the period
    const stats = shapeStats({ period, partial: true, checks: [], reports });

    expect(stats.reportsByDistrict).toHaveLength(10);
    expect(stats.reportsByDistrict[0]).toEqual({
      districtCode: "BG-22",
      total: 3,
      approved: 2,
      pending: 1,
      rejected: 0,
    });
    expect(stats.reportsByDistrict[1]).toEqual({
      districtCode: "BG-02",
      total: 2,
      approved: 0,
      pending: 1,
      rejected: 1,
    });
    expect(stats.reportsByDistrict.map((d) => d.districtCode).slice(2)).toEqual([
      "BG-01",
      "BG-03",
      "BG-04",
      "BG-05",
      "BG-06",
      "BG-07",
      "BG-08",
      "BG-09",
    ]);
    expect(stats.reportsByStatus).toEqual({ approved: 2, pending: 2, rejected: 12 });
    expect(stats.totals.reports).toBe(16);
    expect(stats.partial).toBe(true);
  });

  it("no data: zeros everywhere, no districts", () => {
    const stats = shapeStats({ period, partial: false, checks: [], reports: [] });
    expect(stats.totals).toEqual({ checks: 0, reports: 0 });
    expect(stats.reportsByDistrict).toEqual([]);
    expect(
      stats.checksPerDay.every((day) => day.red + day.yellow + day.green + day.unfinished === 0),
    ).toBe(true);
  });
});
