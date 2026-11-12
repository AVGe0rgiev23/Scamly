// Input rules (Zod schemas) and answer shapes of the moderation API for public reports
// (task W3-04, BUILD_PLAN 3, #28 and #29):
//
//   ModQueueQuerySchema   GET   /api/moderation/reports?status&cursor   the queue
//   ModerateSchema        PATCH /api/moderation/reports/:id             approve / reject
//
// No server-only code here, so the moderator's page (W3-04 UI) can import the same
// rules and types the server uses. A Zod schema is like a Pydantic model.

import { z } from "@/lib/zod";
import type { ScriptType } from "@/engine";
import { bg } from "@/i18n/bg";

// The three states of a report (the database enum public.report_status).
export const MODERATION_STATUSES = ["pending", "approved", "rejected"] as const;
export type ModerationStatus = (typeof MODERATION_STATUSES)[number];

// One page of the queue has this many reports.
export const MODERATION_PAGE_SIZE = 25;
// The length of a reject reason (the table allows up to 500).
export const MIN_REJECT_REASON = 3;
export const MAX_REJECT_REASON = 200;

// A query-string value that may be missing: "" counts as missing too.
function optionalText() {
  return z
    .string()
    .trim()
    .optional()
    .transform((value) => (value === undefined || value === "" ? undefined : value));
}

// GET /api/moderation/reports?status=pending&cursor=<id>
// `status` is "pending" when missing. `cursor` is the id of the last report already
// shown: the next page starts right after it (newest first).
export const ModQueueQuerySchema = z.object(
  {
    status: optionalText().pipe(
      z.enum(MODERATION_STATUSES, { error: bg.moderation.statusInvalid }).default("pending"),
    ),
    cursor: optionalText().pipe(z.guid({ error: bg.moderation.cursorInvalid }).optional()),
  },
  { error: bg.errors.validation },
);
export type ModQueueQuery = z.infer<typeof ModQueueQuerySchema>;

// PATCH /api/moderation/reports/:id
//   { "decision": "approve" }
//   { "decision": "reject", "rejectReason": "Няма връзка с измама." }
// A reason is required for "reject" (3–200 characters) and not stored for "approve".
// `.strict()` rejects any other field (e.g. somebody trying to send "status").
export const ModerateSchema = z
  .object(
    {
      decision: z.enum(["approve", "reject"], { error: bg.moderation.decisionInvalid }),
      rejectReason: z
        .string({ error: bg.moderation.rejectReasonLength })
        .trim()
        .min(MIN_REJECT_REASON, { error: bg.moderation.rejectReasonLength })
        .max(MAX_REJECT_REASON, { error: bg.moderation.rejectReasonLength })
        .optional(),
    },
    { error: bg.errors.validation },
  )
  .strict()
  // Like a Pydantic model_validator: a rule about two fields together.
  .refine((input) => input.decision === "approve" || input.rejectReason !== undefined, {
    error: bg.moderation.rejectReasonRequired,
    path: ["rejectReason"],
  });
export type ModerateInput = z.infer<typeof ModerateSchema>;

// ---------------------------------------------------------------------------------
// Answer shapes
// ---------------------------------------------------------------------------------

// One report in the moderator's queue. The caller's number is NEVER sent, not even
// its hash: only whether there was one, and how many OTHER reports name the same
// number (a "repeat caller").
export type ModerationReportDto = {
  id: string;
  districtCode: string;
  scriptType: ScriptType;
  occurredOn: string; // "YYYY-MM-DD"
  submittedAt: string;
  description: string | null; // already redacted when it was stored
  hasCallerNumber: boolean;
  sameNumberReports: number; // other reports with the same number (0 = none)
  status: ModerationStatus;
  reviewedAt: string | null;
  reviewedByName: string | null; // display name of the moderator (null = deleted account)
  rejectReason: string | null;
};

export type ModerationPageDto = {
  reports: ModerationReportDto[];
  nextCursor: string | null; // null = this is the last page
};

// The answer of PATCH: the new state of the report.
export type ModerationDecisionDto = {
  id: string;
  status: Exclude<ModerationStatus, "pending">;
  reviewedAt: string;
  rejectReason: string | null;
};
