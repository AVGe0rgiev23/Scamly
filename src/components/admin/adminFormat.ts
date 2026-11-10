// Small helpers for the admin pages (W3-06): dates of the charts, bar sizes and the
// Bulgarian names of audit actions. Pure functions (no React, no browser), so they are
// unit-tested in adminFormat.test.ts.

import { bg } from "@/i18n/bg";
import type { LevelCounts } from "@/schemas/admin";

// "2026-11-09" -> „9.11“ (short, under the day chart).
export function formatShortDay(isoDate: string): string {
  const [, month, day] = isoDate.split("-");
  return `${Number(day)}.${month}`;
}

// "2026-11-09" -> „9 ноември 2026 г.“ (the period line and the tables). The date is a
// calendar day already, so it is formatted in UTC (no time zone can shift it).
export function formatLongDay(isoDate: string): string {
  return new Intl.DateTimeFormat("bg-BG", {
    timeZone: "UTC",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(`${isoDate}T00:00:00Z`));
}

// All checks of one day.
export function dayTotal(counts: LevelCounts): number {
  return counts.red + counts.yellow + counts.green + counts.unfinished;
}

// The length of a bar in percent of the longest one (0 when there is nothing).
// Like round(value / max * 100, 1) in Python.
export function barPercent(value: number, max: number): number {
  if (max <= 0 || value <= 0) {
    return 0;
  }
  return Math.round((Math.min(value, max) / max) * 1000) / 10;
}

// The Bulgarian name of an audit action, or the code itself for an action we don't
// know yet (a new feature may add one before this list learns it).
export function actionLabel(action: string): string {
  const names: Record<string, string> = bg.admin.actions;
  return names[action] ?? action;
}

// The Bulgarian name of what an audit line is about (target_type), or the code.
export function targetLabel(targetType: string): string {
  const names: Record<string, string> = bg.admin.targets;
  return names[targetType] ?? targetType;
}
