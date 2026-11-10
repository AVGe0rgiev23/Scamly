// The moderation queue for public reports (task W3-04, BUILD_PLAN 3, #28 and #29):
//
//   listQueue()      GET   /api/moderation/reports?status&cursor   25 per page, newest first
//   reviewReport()   PATCH /api/moderation/reports/:id             approve / reject, audited
//
// A report counts on the public map only after a moderator approves it, so spam,
// jokes and wrong districts never reach the map.
//
// The two locks (BUILD_PLAN section 0): the route checks the role (requireRole with
// MODERATION_ROLES), and every read and write of `reports` uses the moderator's own
// USER client, so RLS and the column privileges check again in the database. The
// admin client is used only for the audit line and for the reviewers' display names
// (a moderator may read only their own profile).
//
// Like the other services, the outside world comes in `deps`, so the unit tests use
// fakes and no database (dependency injection).

import "server-only";
import type { AppRole } from "@/config/routes";
import { bg } from "@/i18n/bg";
import {
  MODERATION_PAGE_SIZE,
  ModerateSchema,
  ModQueueQuerySchema,
  type ModerationDecisionDto,
  type ModerationPageDto,
  type ModerationReportDto,
  type ModerationStatus,
} from "@/schemas/moderation";
import type { Actor } from "@/server/auth/actor";
import { badRequest, conflict, notFound } from "@/server/http/errors";
import { findDisplayNames } from "@/server/repositories/adminRepository";
import { writeAudit, type AuditEntry } from "@/server/repositories/auditRepository";
import {
  countReportsWithHash,
  findReportState,
  listQueuePage,
  reviewPendingReport,
  type ModerationRow,
  type QueueCursor,
  type ReviewChange,
} from "@/server/repositories/moderationRepository";
import type { DbClient } from "@/server/supabase/userClient";

// Who may moderate (admins can do everything a moderator can).
export const MODERATION_ROLES: AppRole[] = ["moderator", "admin"];

// Everything the service needs from the outside world (tests pass fakes).
export type ModerationDeps = {
  now: () => Date;
  listPage: (
    status: ModerationStatus,
    after: QueueCursor | null,
    limit: number,
  ) => Promise<ModerationRow[]>;
  findState: (id: string) => Promise<{ submittedAt: string; status: ModerationStatus } | null>;
  countSameNumber: (hash: string) => Promise<number>;
  findNames: (ids: string[]) => Promise<Map<string, string>>; // admin client
  review: (
    id: string,
    change: ReviewChange,
  ) => Promise<{
    id: string;
    district_code: string;
    script_type: string;
  } | null>;
  writeAudit: (entry: AuditEntry) => Promise<void>; // admin client
};

// ---------------------------------------------------------------------------------
// GET /api/moderation/reports
// ---------------------------------------------------------------------------------
export async function listQueue(deps: ModerationDeps, query: unknown): Promise<ModerationPageDto> {
  const input = ModQueueQuerySchema.parse(query); // 400 with a Bulgarian message

  // The cursor is the id of the last report already shown; we need its time.
  let after: QueueCursor | null = null;
  if (input.cursor !== undefined) {
    const state = await deps.findState(input.cursor);
    if (state === null) {
      throw badRequest("validation", bg.moderation.cursorInvalid);
    }
    after = { submittedAt: state.submittedAt, id: input.cursor };
  }

  const rows = await deps.listPage(input.status, after, MODERATION_PAGE_SIZE);
  const page = rows.slice(0, MODERATION_PAGE_SIZE);
  const hasMore = rows.length > MODERATION_PAGE_SIZE;

  // Repeat callers: for each different number on this page, how many reports name
  // it. Only the counts leave this function, never the hashes.
  const hashes = [...new Set(page.map((row) => row.caller_number_hash).filter(isText))];
  const counts = new Map<string, number>();
  await Promise.all(
    hashes.map(async (hash) => {
      counts.set(hash, await deps.countSameNumber(hash));
    }),
  );

  // Display names of the moderators who reviewed these reports.
  const reviewerIds = [...new Set(page.map((row) => row.reviewed_by).filter(isText))];
  const names = await deps.findNames(reviewerIds);

  const reports = page.map((row): ModerationReportDto => {
    const sameNumber =
      row.caller_number_hash === null ? 0 : (counts.get(row.caller_number_hash) ?? 1) - 1;
    return {
      id: row.id,
      districtCode: row.district_code,
      scriptType: row.script_type,
      occurredOn: row.occurred_on,
      submittedAt: row.submitted_at,
      description: row.description_redacted,
      hasCallerNumber: row.caller_number_hash !== null,
      sameNumberReports: Math.max(0, sameNumber),
      status: row.status,
      reviewedAt: row.reviewed_at,
      reviewedByName: row.reviewed_by === null ? null : (names.get(row.reviewed_by) ?? null),
      rejectReason: row.reject_reason,
    };
  });

  const last = page.at(-1);
  return { reports, nextCursor: hasMore && last !== undefined ? last.id : null };
}

// A type guard: "this value is a string" (filters out the nulls, like `if x is not None`).
function isText(value: string | null): value is string {
  return value !== null;
}

// ---------------------------------------------------------------------------------
// PATCH /api/moderation/reports/:id
// ---------------------------------------------------------------------------------
export async function reviewReport(
  deps: ModerationDeps,
  actor: Actor,
  id: string,
  body: unknown,
): Promise<ModerationDecisionDto> {
  const input = ModerateSchema.parse(body); // 400 with a Bulgarian message

  const status = input.decision === "approve" ? "approved" : "rejected";
  const change: ReviewChange = {
    status,
    reviewedBy: actor.userId,
    reviewedAt: deps.now().toISOString(),
    // Only a rejection keeps its reason.
    rejectReason: status === "rejected" ? (input.rejectReason ?? null) : null,
  };

  // Compare-and-set: only a PENDING report changes.
  const changed = await deps.review(id, change);
  if (changed === null) {
    // Nothing changed: either there is no such report (404), or somebody has already
    // reviewed it (409). Nothing is written to the audit log in either case.
    const state = await deps.findState(id);
    if (state === null) {
      throw notFound();
    }
    throw conflict("already_reviewed", bg.moderation.alreadyReviewed);
  }

  // One audit line. No free text (never the reason or the description): only the
  // district and the kind of scam, which are also public on the map.
  await deps.writeAudit({
    actorId: actor.userId,
    action: status === "approved" ? "report_approved" : "report_rejected",
    targetType: "report",
    targetId: changed.id,
    details: { district_code: changed.district_code, script_type: changed.script_type },
  });

  return {
    id: changed.id,
    status,
    reviewedAt: change.reviewedAt,
    rejectReason: change.rejectReason,
  };
}

// ---------------------------------------------------------------------------------
// The real deps. `client` is the moderator's user client; `admin` (the audit line and
// the reviewers' names) is created only when needed.
// ---------------------------------------------------------------------------------
export function createModerationDeps(client: DbClient, admin: () => DbClient): ModerationDeps {
  return {
    now: () => new Date(),
    listPage: (status, after, limit) => listQueuePage(client, status, after, limit),
    findState: (id) => findReportState(client, id),
    countSameNumber: (hash) => countReportsWithHash(client, hash),
    findNames: async (ids) => (ids.length === 0 ? new Map() : findDisplayNames(admin(), ids)),
    review: (id, change) => reviewPendingReport(client, id, change),
    writeAudit: (entry) => writeAudit(admin(), entry),
  };
}
