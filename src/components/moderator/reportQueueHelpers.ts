// Small helpers for the moderator's report queue (/moderator/reports, W3-04 UI) and its
// card on the hub. Pure functions (no React, no browser), so they are unit-tested in
// reportQueue.test.ts.

import { formatLongDay } from "@/components/admin/adminFormat";
import { districtName, fill, formatDateTime } from "@/components/family/format";
import { bg } from "@/i18n/bg";
import {
  MAX_REJECT_REASON,
  MIN_REJECT_REASON,
  MODERATION_PAGE_SIZE,
  type ModerationReportDto,
  type ModerationStatus,
} from "@/schemas/moderation";

export const QUEUE_API = "/api/moderation/reports";

// "/api/moderation/reports?status=approved&cursor=<id>" (no cursor for the first page).
// URLSearchParams is like Python's urllib.parse.urlencode.
export function queueUrl(status: ModerationStatus, cursor: string | null): string {
  const params = new URLSearchParams({ status });
  if (cursor !== null) params.set("cursor", cursor);
  return `${QUEUE_API}?${params.toString()}`;
}

// "2026-11-05" -> „Обаждане на 5 ноември 2026 г.“. The call day is a calendar day,
// not a moment, so no time zone can move it to another day.
export function callDayText(occurredOn: string): string {
  return fill(bg.moderator.reportCallDay, { date: formatLongDay(occurredOn) });
}

// The repeat-caller badge: „Още 3 сигнала от същия номер“, or null when no other
// report names the same number. It shows ONLY how many; the number itself and its
// hash never reach the browser (the API sends just the count).
export function repeatBadgeText(sameNumberReports: number): string | null {
  if (!Number.isInteger(sameNumberReports) || sameNumberReports <= 0) return null;
  if (sameNumberReports === 1) return bg.moderator.repeatOne;
  return fill(bg.moderator.repeatMany, { count: sameNumberReports });
}

// „Одобрен от Мария на 9 ноември 2026 г., 14:30 ч.“ for a reviewed report (time in
// Bulgaria, Europe/Sofia), or null for a pending one.
export function reviewedText(report: ModerationReportDto): string | null {
  if (report.status === "pending" || report.reviewedAt === null) return null;
  const template = report.status === "approved" ? bg.moderator.approvedBy : bg.moderator.rejectedBy;
  return fill(template, {
    name: report.reviewedByName ?? bg.moderator.deletedReviewer,
    time: formatDateTime(report.reviewedAt),
  });
}

// What a screen reader hears after „Одобри“ / „Отхвърли“, so the buttons of different
// cards have different names: „сигнал „Полицай“ от област Пловдив“.
export function reportContext(report: ModerationReportDto): string {
  return fill(bg.moderator.reportButtonContext, {
    type: bg.scripts.typeNames[report.scriptType],
    district: districtName(report.districtCode),
  });
}

// The same rule as the server (ModerateSchema): 3–200 characters after trimming.
// Returns the Bulgarian error, or null when the reason is fine.
export function rejectReasonError(reason: string): string | null {
  const length = reason.trim().length;
  if (length === 0) return bg.moderation.rejectReasonRequired;
  if (length < MIN_REJECT_REASON || length > MAX_REJECT_REASON) {
    return bg.moderation.rejectReasonLength;
  }
  return null;
}

// The pending count on the hub card, from the FIRST page of the queue only:
// „3“, or „25+“ when the page is full or there is another page.
export function pendingCountText(shown: number, nextCursor: string | null): string {
  if (shown >= MODERATION_PAGE_SIZE || nextCursor !== null) return `${MODERATION_PAGE_SIZE}+`;
  return String(shown);
}
