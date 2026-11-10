// The admin's statistics (W3-06): pure functions that turn database rows into the
// numbers of the charts. No database here, so the unit tests give plain arrays.
//
//   statsPeriod(now, days)  the period: from = today - (days - 1), to = today (Bulgaria)
//   shapeStats(...)         checks per day by level, by level, by script type,
//                           reports per district (top 10) and by status
//
// Days are calendar days in Bulgaria (Europe/Sofia), not UTC: a check at 00:30 Sofia
// time belongs to that day, although in UTC it is still the day before.

import { SCRIPT_TYPES } from "@/engine";
import {
  TOP_DISTRICTS,
  type AdminStatsDto,
  type LevelCounts,
  type StatusCounts,
} from "@/schemas/admin";
import { addDays, todayInBulgaria } from "@/schemas/reports";
import type { StatsCheckRow, StatsReportRow } from "@/server/repositories/adminRepository";

export type StatsPeriod = {
  days: number;
  from: string; // "YYYY-MM-DD"
  to: string;
  // The moment to read rows from. One day earlier than needed (UTC midnight of the
  // day before `from`), so no Sofia-time row is missed; shapeStats() drops the extra.
  sinceIso: string;
};

export function statsPeriod(now: Date, days: number): StatsPeriod {
  const to = todayInBulgaria(now);
  const from = addDays(to, -(days - 1));
  return { days, from, to, sinceIso: `${addDays(from, -1)}T00:00:00.000Z` };
}

// The Bulgarian calendar day of a moment, e.g. "2026-11-08T23:30:00Z" -> "2026-11-09".
export function dayInBulgaria(iso: string): string {
  return todayInBulgaria(new Date(iso));
}

// Every day from `from` to `to`, both included (like a Python range of dates).
export function daysBetween(from: string, to: string): string[] {
  const days: string[] = [];
  for (let day = from; day <= to; day = addDays(day, 1)) {
    days.push(day);
  }
  return days;
}

function emptyLevels(): LevelCounts {
  return { red: 0, yellow: 0, green: 0, unfinished: 0 };
}
function emptyStatuses(): StatusCounts {
  return { approved: 0, pending: 0, rejected: 0 };
}

export function shapeStats(input: {
  period: StatsPeriod;
  checks: StatsCheckRow[];
  reports: StatsReportRow[];
  partial: boolean;
}): AdminStatsDto {
  const { period } = input;
  const inPeriod = (day: string) => day >= period.from && day <= period.to;

  // Checks: one counter per day (a Map keeps the days in order), per level, per script.
  const perDay = new Map<string, LevelCounts>();
  for (const day of daysBetween(period.from, period.to)) {
    perDay.set(day, emptyLevels());
  }
  const byLevel = emptyLevels();
  const byScript = new Map<string, number>(SCRIPT_TYPES.map((type) => [type, 0]));
  let checkCount = 0;

  for (const check of input.checks) {
    const day = dayInBulgaria(check.started_at);
    const counts = perDay.get(day);
    if (counts === undefined || !inPeriod(day)) {
      continue; // the extra day read "just in case", or a clock glitch
    }
    const level = check.risk_level ?? "unfinished";
    counts[level] += 1;
    byLevel[level] += 1;
    checkCount += 1;
    if (check.risk_level !== null && check.script_type !== null) {
      byScript.set(check.script_type, (byScript.get(check.script_type) ?? 0) + 1);
    }
  }

  // Reports: per district (with its statuses) and per status.
  const perDistrict = new Map<string, StatusCounts>();
  const byStatus = emptyStatuses();
  let reportCount = 0;
  for (const report of input.reports) {
    if (!inPeriod(dayInBulgaria(report.submitted_at))) {
      continue;
    }
    const counts = perDistrict.get(report.district_code) ?? emptyStatuses();
    counts[report.status] += 1;
    perDistrict.set(report.district_code, counts);
    byStatus[report.status] += 1;
    reportCount += 1;
  }

  // Top 10 districts: most reports first; equal counts by district code (stable order).
  const districts = [...perDistrict.entries()]
    .map(([districtCode, counts]) => ({
      districtCode,
      total: counts.approved + counts.pending + counts.rejected,
      ...counts,
    }))
    .sort((a, b) => b.total - a.total || a.districtCode.localeCompare(b.districtCode))
    .slice(0, TOP_DISTRICTS);

  return {
    days: period.days,
    from: period.from,
    to: period.to,
    checksPerDay: [...perDay.entries()].map(([date, counts]) => ({ date, ...counts })),
    checksByLevel: byLevel,
    checksByScript: SCRIPT_TYPES.map((scriptType) => ({
      scriptType,
      count: byScript.get(scriptType) ?? 0,
    })),
    reportsByDistrict: districts,
    reportsByStatus: byStatus,
    totals: { checks: checkCount, reports: reportCount },
    partial: input.partial,
  };
}
