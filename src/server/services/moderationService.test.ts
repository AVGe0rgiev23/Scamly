// Unit tests for the moderation queue (moderationService.ts, W3-04) with an in-memory
// fake of the reports table instead of Supabase. The real RLS rules (only moderators
// and admins read and review reports, and may change only the moderation columns) are
// tested in supabase/tests/06_public_reports_scripts.

import { describe, expect, it } from "vitest";
import { ZodError } from "zod";
import { bg } from "@/i18n/bg";
import { ModerateSchema, ModQueueQuerySchema } from "@/schemas/moderation";
import type { Actor } from "@/server/auth/actor";
import { checkRole } from "@/server/auth/requireRole";
import { ApiError } from "@/server/http/errors";
import type { AuditEntry } from "@/server/repositories/auditRepository";
import type { ModerationRow, ReviewChange } from "@/server/repositories/moderationRepository";
import {
  listQueue,
  MODERATION_ROLES,
  reviewReport,
  type ModerationDeps,
} from "@/server/services/moderationService";

const MOD_ID = "b0000000-0000-4000-8000-000000000003";
const OTHER_MOD_ID = "b0000000-0000-4000-8000-000000000004";
const NOW = new Date("2026-11-10T09:00:00Z");

function actorOf(userId: string, role: Actor["role"]): Actor {
  return {
    userId,
    role,
    profile: { id: userId, role, display_name: "x", email_alerts: true, created_at: "" },
    device: null,
  };
}
const MODERATOR = actorOf(MOD_ID, "moderator");

// A report id that sorts by its number: r(1) < r(2) < …
function r(n: number): string {
  return `c0000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
}

function report(n: number, fields: Partial<ModerationRow> = {}): ModerationRow {
  return {
    id: r(n),
    district_code: "BG-02",
    script_type: "police",
    occurred_on: "2026-11-08",
    description_redacted: "Казаха, че са от полицията.",
    caller_number_hash: null,
    status: "pending",
    // One minute apart: a larger n is newer.
    submitted_at: new Date(Date.UTC(2026, 10, 9, 8, n)).toISOString(),
    reviewed_by: null,
    reviewed_at: null,
    reject_reason: null,
    ...fields,
  };
}

// The fake world: the reports table and the audit lines written.
function fakeDeps(rows: ModerationRow[], overrides: Partial<ModerationDeps> = {}) {
  const audit: AuditEntry[] = [];
  const reviews: { id: string; change: ReviewChange }[] = [];
  const deps: ModerationDeps = {
    now: () => NOW,
    // Newest first, id breaks ties, `limit + 1` rows, like listQueuePage().
    listPage: async (status, after, limit) =>
      rows
        .filter((row) => row.status === status)
        .sort((a, b) =>
          a.submitted_at === b.submitted_at
            ? b.id.localeCompare(a.id)
            : b.submitted_at.localeCompare(a.submitted_at),
        )
        .filter(
          (row) =>
            after === null ||
            row.submitted_at < after.submittedAt ||
            (row.submitted_at === after.submittedAt && row.id < after.id),
        )
        .slice(0, limit + 1),
    findState: async (id) => {
      const row = rows.find((one) => one.id === id);
      return row === undefined ? null : { submittedAt: row.submitted_at, status: row.status };
    },
    countSameNumber: async (hash) => rows.filter((row) => row.caller_number_hash === hash).length,
    findNames: async (ids) =>
      new Map(ids.filter((id) => id === MOD_ID).map((id) => [id, "Демо модератор"])),
    // Compare-and-set, like `update … where id = $1 and status = 'pending'`.
    review: async (id, change) => {
      reviews.push({ id, change });
      const row = rows.find((one) => one.id === id && one.status === "pending");
      if (row === undefined) return null;
      row.status = change.status;
      row.reviewed_by = change.reviewedBy;
      row.reviewed_at = change.reviewedAt;
      row.reject_reason = change.rejectReason;
      return { id: row.id, district_code: row.district_code, script_type: row.script_type };
    },
    writeAudit: async (entry) => {
      audit.push(entry);
    },
    ...overrides,
  };
  return { deps, audit, reviews, rows };
}

// Runs a promise that should fail and returns the error (like pytest.raises).
async function failure(promise: Promise<unknown>): Promise<unknown> {
  try {
    await promise;
  } catch (error) {
    return error;
  }
  throw new Error("expected a failure");
}

async function apiFailure(promise: Promise<unknown>): Promise<ApiError> {
  const error = await failure(promise);
  expect(error).toBeInstanceOf(ApiError);
  return error as ApiError;
}

describe("who may moderate", () => {
  it("moderators and admins; a guest gets 401, a family member or a phone 403", () => {
    expect(() => checkRole(null, MODERATION_ROLES)).toThrow(
      expect.objectContaining({ status: 401 }),
    );
    for (const role of ["family", "protected"] as const) {
      expect(() => checkRole(actorOf("x", role), MODERATION_ROLES)).toThrow(
        expect.objectContaining({ status: 403 }),
      );
    }
    expect(checkRole(MODERATOR, MODERATION_ROLES)).toBe(MODERATOR);
    const admin = actorOf("a", "admin");
    expect(checkRole(admin, MODERATION_ROLES)).toBe(admin);
  });
});

describe("the query and body rules", () => {
  it("status defaults to pending; unknown status and a broken cursor are 400 in Bulgarian", () => {
    expect(ModQueueQuerySchema.parse({})).toEqual({ status: "pending", cursor: undefined });
    expect(ModQueueQuerySchema.parse({ status: "", cursor: "" }).status).toBe("pending");
    expect(ModQueueQuerySchema.parse({ status: "rejected", cursor: r(3) })).toEqual({
      status: "rejected",
      cursor: r(3),
    });
    expect(ModQueueQuerySchema.safeParse({ status: "spam" }).error?.issues[0]?.message).toBe(
      bg.moderation.statusInvalid,
    );
    expect(ModQueueQuerySchema.safeParse({ cursor: "25" }).error?.issues[0]?.message).toBe(
      bg.moderation.cursorInvalid,
    );
  });

  it("a rejection needs a reason of 3–200 characters; other fields are refused", () => {
    expect(ModerateSchema.parse({ decision: "approve" })).toEqual({ decision: "approve" });
    expect(ModerateSchema.parse({ decision: "reject", rejectReason: "  Реклама  " })).toEqual({
      decision: "reject",
      rejectReason: "Реклама",
    });
    expect(ModerateSchema.safeParse({ decision: "reject" }).error?.issues[0]?.message).toBe(
      bg.moderation.rejectReasonRequired,
    );
    for (const reason of ["ab", "х".repeat(201)]) {
      expect(
        ModerateSchema.safeParse({ decision: "reject", rejectReason: reason }).error?.issues[0]
          ?.message,
      ).toBe(bg.moderation.rejectReasonLength);
    }
    expect(ModerateSchema.safeParse({ decision: "maybe" }).success).toBe(false);
    expect(ModerateSchema.safeParse({ decision: "approve", status: "approved" }).success).toBe(
      false,
    );
  });
});

describe("listQueue (GET /api/moderation/reports)", () => {
  it("pending reports, newest first, 25 per page, with a cursor to the next page", async () => {
    const rows = Array.from({ length: 30 }, (_, i) => report(i + 1));
    rows.push(report(99, { status: "approved" }));
    const { deps } = fakeDeps(rows);

    const first = await listQueue(deps, {});
    expect(first.reports).toHaveLength(25);
    expect(first.reports[0]?.id).toBe(r(30));
    expect(first.reports.every((one) => one.status === "pending")).toBe(true);
    expect(first.nextCursor).toBe(r(6));

    const second = await listQueue(deps, { cursor: first.nextCursor });
    expect(second.reports.map((one) => one.id)).toEqual([r(5), r(4), r(3), r(2), r(1)]);
    expect(second.nextCursor).toBeNull();
  });

  it("two reports at the same moment are both shown, once each", async () => {
    const same = "2026-11-09T08:00:00.123456+00:00";
    const rows = Array.from({ length: 27 }, (_, i) => report(i + 1, { submitted_at: same }));
    const { deps } = fakeDeps(rows);

    const first = await listQueue(deps, {});
    const second = await listQueue(deps, { cursor: first.nextCursor });
    const ids = [...first.reports, ...second.reports].map((one) => one.id);
    expect(new Set(ids).size).toBe(27);
  });

  it("an unknown cursor is a Bulgarian 400", async () => {
    const { deps } = fakeDeps([report(1)]);
    const error = await apiFailure(listQueue(deps, { cursor: r(42) }));
    expect(error.status).toBe(400);
    expect(error.messageBg).toBe(bg.moderation.cursorInvalid);
    expect(await failure(listQueue(deps, { status: "all" }))).toBeInstanceOf(ZodError);
  });

  it("repeat callers: only whether there is a number and how many OTHER reports share it", async () => {
    const { deps } = fakeDeps([
      report(1, { caller_number_hash: "hash-a" }),
      report(2, { caller_number_hash: "hash-a", status: "rejected" }),
      report(3, { caller_number_hash: "hash-a" }),
      report(4, { caller_number_hash: "hash-b" }),
      report(5),
    ]);

    const page = await listQueue(deps, {});
    const byId = new Map(page.reports.map((one) => [one.id, one]));
    expect(byId.get(r(3))).toMatchObject({ hasCallerNumber: true, sameNumberReports: 2 });
    expect(byId.get(r(1))).toMatchObject({ hasCallerNumber: true, sameNumberReports: 2 });
    expect(byId.get(r(4))).toMatchObject({ hasCallerNumber: true, sameNumberReports: 0 });
    expect(byId.get(r(5))).toMatchObject({ hasCallerNumber: false, sameNumberReports: 0 });
    // The hash itself never leaves the service.
    expect(JSON.stringify(page)).not.toContain("hash-");
  });

  it("reviewed reports show when, by whom (display name) and why", async () => {
    const { deps } = fakeDeps([
      report(1, {
        status: "rejected",
        reviewed_by: MOD_ID,
        reviewed_at: "2026-11-09T10:00:00Z",
        reject_reason: "Не е измама.",
      }),
      report(2, { status: "rejected", reviewed_by: OTHER_MOD_ID, reviewed_at: "x" }),
    ]);

    const page = await listQueue(deps, { status: "rejected" });
    expect(page.reports.map((one) => one.reviewedByName)).toEqual([null, "Демо модератор"]);
    expect(page.reports[1]).toMatchObject({
      reviewedAt: "2026-11-09T10:00:00Z",
      rejectReason: "Не е измама.",
      districtCode: "BG-02",
      scriptType: "police",
      occurredOn: "2026-11-08",
      description: "Казаха, че са от полицията.",
    });
  });
});

describe("reviewReport (PATCH /api/moderation/reports/:id)", () => {
  it("approves a pending report: who and when are set, and one audit line without free text", async () => {
    const { deps, audit, rows } = fakeDeps([report(1)]);

    const result = await reviewReport(deps, MODERATOR, r(1), { decision: "approve" });

    expect(result).toEqual({
      id: r(1),
      status: "approved",
      reviewedAt: NOW.toISOString(),
      rejectReason: null,
    });
    expect(rows[0]).toMatchObject({
      status: "approved",
      reviewed_by: MOD_ID,
      reviewed_at: NOW.toISOString(),
    });
    expect(audit).toEqual([
      {
        actorId: MOD_ID,
        action: "report_approved",
        targetType: "report",
        targetId: r(1),
        details: { district_code: "BG-02", script_type: "police" },
      },
    ]);
  });

  it("rejects with a reason; the reason is stored but never written to the audit log", async () => {
    const { deps, audit, rows } = fakeDeps([report(1)]);

    const result = await reviewReport(deps, MODERATOR, r(1), {
      decision: "reject",
      rejectReason: "Реклама, не е измама.",
    });

    expect(result.status).toBe("rejected");
    expect(rows[0]?.reject_reason).toBe("Реклама, не е измама.");
    expect(audit).toHaveLength(1);
    expect(audit[0]?.action).toBe("report_rejected");
    expect(JSON.stringify(audit)).not.toContain("Реклама");
    expect(JSON.stringify(audit)).not.toContain("полицията");
  });

  it("an approval never keeps a reason", async () => {
    const { deps, rows } = fakeDeps([report(1)]);
    await reviewReport(deps, MODERATOR, r(1), { decision: "approve", rejectReason: "Защо не" });
    expect(rows[0]?.reject_reason).toBeNull();
  });

  it("reject without a reason: 400 before anything is changed", async () => {
    const { deps, reviews, audit } = fakeDeps([report(1)]);

    const error = await failure(reviewReport(deps, MODERATOR, r(1), { decision: "reject" }));

    expect(error).toBeInstanceOf(ZodError);
    expect((error as ZodError).issues[0]?.message).toBe(bg.moderation.rejectReasonRequired);
    expect(reviews).toEqual([]);
    expect(audit).toEqual([]);
  });

  it("an already reviewed report: 409, nothing changed, no audit line", async () => {
    const { deps, audit, rows } = fakeDeps([
      report(1, { status: "rejected", reviewed_by: OTHER_MOD_ID, reject_reason: "Спам." }),
    ]);

    const error = await apiFailure(reviewReport(deps, MODERATOR, r(1), { decision: "approve" }));

    expect(error.status).toBe(409);
    expect(error.messageBg).toBe(bg.moderation.alreadyReviewed);
    expect(rows[0]).toMatchObject({ status: "rejected", reviewed_by: OTHER_MOD_ID });
    expect(audit).toEqual([]);
  });

  it("two moderators at once: the first wins, the second gets 409", async () => {
    const { deps, audit } = fakeDeps([report(1)]);
    const other = actorOf(OTHER_MOD_ID, "moderator");

    const results = await Promise.allSettled([
      reviewReport(deps, MODERATOR, r(1), { decision: "approve" }),
      reviewReport(deps, other, r(1), { decision: "reject", rejectReason: "Спам." }),
    ]);

    expect(results.map((one) => one.status)).toEqual(["fulfilled", "rejected"]);
    expect(audit).toHaveLength(1);
  });

  it("an unknown report: 404", async () => {
    const { deps, audit } = fakeDeps([report(1)]);
    const error = await apiFailure(reviewReport(deps, MODERATOR, r(7), { decision: "approve" }));
    expect(error.status).toBe(404);
    expect(audit).toEqual([]);
  });

  it("a failed audit write fails the request", async () => {
    const { deps } = fakeDeps([report(1)], {
      writeAudit: async () => {
        throw new Error("audit down");
      },
    });
    expect(await failure(reviewReport(deps, MODERATOR, r(1), { decision: "approve" }))).toEqual(
      new Error("audit down"),
    );
  });
});
