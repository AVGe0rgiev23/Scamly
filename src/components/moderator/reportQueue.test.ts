// Unit tests for the report-queue helpers (W3-04 UI): URLs, dates, the repeat-caller
// badge, the reviewer line, the reject-reason rule and the hub's pending count.

import { describe, expect, it } from "vitest";
import { bg } from "@/i18n/bg";
import type { ModerationReportDto } from "@/schemas/moderation";
import { ModerateSchema } from "@/schemas/moderation";
import {
  callDayText,
  pendingCountText,
  queueUrl,
  rejectReasonError,
  repeatBadgeText,
  reportContext,
  reviewedText,
} from "./reportQueueHelpers";

const REPORT: ModerationReportDto = {
  id: "c0000000-0000-4000-8000-000000000001",
  districtCode: "BG-16",
  scriptType: "police",
  occurredOn: "2026-11-05",
  submittedAt: "2026-11-05T10:00:00Z",
  description: "Обадиха се от „полицията“.",
  hasCallerNumber: true,
  sameNumberReports: 0,
  status: "pending",
  reviewedAt: null,
  reviewedByName: null,
  rejectReason: null,
};

describe("queueUrl", () => {
  it("asks for one status, with the cursor only when there is one", () => {
    expect(queueUrl("pending", null)).toBe("/api/moderation/reports?status=pending");
    expect(queueUrl("rejected", "abc")).toBe("/api/moderation/reports?status=rejected&cursor=abc");
  });
});

describe("callDayText", () => {
  it("writes the call day in Bulgarian, without moving it by a time zone", () => {
    expect(callDayText("2026-11-05")).toBe("Обаждане на 5 ноември 2026 г.");
    expect(callDayText("2026-01-01")).toBe("Обаждане на 1 януари 2026 г.");
  });
});

describe("repeatBadgeText", () => {
  it("is empty without other reports", () => {
    expect(repeatBadgeText(0)).toBeNull();
    expect(repeatBadgeText(-1)).toBeNull();
    expect(repeatBadgeText(1.5)).toBeNull();
  });
  it("says one or many, with only the count", () => {
    expect(repeatBadgeText(1)).toBe(bg.moderator.repeatOne);
    expect(repeatBadgeText(4)).toBe("Още 4 сигнала от същия номер");
  });
});

describe("reviewedText", () => {
  it("is empty for a pending report", () => {
    expect(reviewedText(REPORT)).toBeNull();
  });
  it("names the reviewer and the time in Bulgaria", () => {
    const approved = {
      ...REPORT,
      status: "approved" as const,
      reviewedAt: "2026-11-09T12:30:00Z", // 14:30 in Sofia (winter time, UTC+2)
      reviewedByName: "Мария",
    };
    expect(reviewedText(approved)).toBe("Одобрен от Мария на 9 ноември 2026 г., 14:30 ч.");
  });
  it("says „изтрит профил“ when the reviewer's account is gone", () => {
    const rejected = {
      ...REPORT,
      status: "rejected" as const,
      reviewedAt: "2026-11-09T12:30:00Z",
      rejectReason: "Спам",
    };
    expect(reviewedText(rejected)).toContain(`Отхвърлен от ${bg.moderator.deletedReviewer}`);
  });
});

describe("reportContext", () => {
  it("names the scam type and the district", () => {
    expect(reportContext(REPORT)).toBe("сигнал „Полицай“ от област Пловдив");
  });
});

describe("rejectReasonError", () => {
  it("needs a reason of 3–200 characters, like the server", () => {
    expect(rejectReasonError("")).toBe(bg.moderation.rejectReasonRequired);
    expect(rejectReasonError("   ")).toBe(bg.moderation.rejectReasonRequired);
    expect(rejectReasonError(" ab ")).toBe(bg.moderation.rejectReasonLength);
    expect(rejectReasonError("x".repeat(201))).toBe(bg.moderation.rejectReasonLength);
    expect(rejectReasonError("Спам")).toBeNull();
    expect(rejectReasonError("x".repeat(200))).toBeNull();
  });
  it("every quick-pick reason passes the server's own schema", () => {
    for (const reason of bg.moderator.quickReasons) {
      expect(rejectReasonError(reason)).toBeNull();
      expect(ModerateSchema.safeParse({ decision: "reject", rejectReason: reason }).success).toBe(
        true,
      );
    }
  });
});

describe("pendingCountText", () => {
  it("shows the count of the first page, or „25+“ when there may be more", () => {
    expect(pendingCountText(0, null)).toBe("0");
    expect(pendingCountText(7, null)).toBe("7");
    expect(pendingCountText(25, null)).toBe("25+");
    expect(pendingCountText(3, "next-id")).toBe("25+");
  });
});
