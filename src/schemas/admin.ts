// Input rules (Zod schemas) and answer shapes of the admin API (task W3-06,
// BUILD_PLAN 3, #32–#35):
//
//   UsersQuerySchema    GET   /api/admin/users?q&role&cursor     the list of accounts
//   ChangeRoleSchema    PATCH /api/admin/users/:id/role          { role }
//   StatsQuerySchema    GET   /api/admin/stats?days=7..90        the numbers for the charts
//   AuditQuerySchema    GET   /api/admin/audit-log?cursor        the audit log, 50 per page
//
// No server-only code here, so the admin pages in the browser can import the types.
// A Zod schema is like a Pydantic model.

import { z } from "zod";
import type { RiskLevel, ScriptType } from "@/engine";
import { bg } from "@/i18n/bg";

// The roles an admin may GIVE. Never "protected": that role belongs only to a paired
// phone, and only the pairing code creates it (BUILD_PLAN 5).
export const ASSIGNABLE_ROLES = ["family", "moderator", "admin"] as const;
export type AssignableRole = (typeof ASSIGNABLE_ROLES)[number];

// How many rows one page of the lists has.
export const USERS_PAGE_SIZE = 25;
export const AUDIT_PAGE_SIZE = 50;
// The statistics period, in days (the page offers 7, 30 and 90).
export const MIN_STATS_DAYS = 7;
export const MAX_STATS_DAYS = 90;
export const DEFAULT_STATS_DAYS = 30;
export const STATS_PERIODS = [7, 30, 90] as const;
// How many districts the "reports per district" chart shows.
export const TOP_DISTRICTS = 10;
export const MAX_SEARCH_LENGTH = 100;

// A query-string value that may be missing: "" counts as missing too.
function optionalText() {
  return z
    .string()
    .trim()
    .optional()
    .transform((value) => (value === undefined || value === "" ? undefined : value));
}

// GET /api/admin/users. `cursor` is the number of rows already shown ("25", "50"…).
export const UsersQuerySchema = z.object(
  {
    q: optionalText().pipe(
      z.string().max(MAX_SEARCH_LENGTH, { error: bg.admin.searchTooLong }).optional(),
    ),
    role: optionalText().pipe(z.enum(ASSIGNABLE_ROLES, { error: bg.admin.roleInvalid }).optional()),
    cursor: optionalText().pipe(
      z
        .string()
        .regex(/^\d{1,6}$/, { error: bg.admin.cursorInvalid })
        .transform(Number)
        .optional(),
    ),
  },
  { error: bg.errors.validation },
);
export type UsersQuery = z.infer<typeof UsersQuerySchema>;

// PATCH /api/admin/users/:id/role. `.strict()` rejects any other field.
export const ChangeRoleSchema = z
  .object(
    { role: z.enum(ASSIGNABLE_ROLES, { error: bg.admin.roleInvalid }) },
    {
      error: bg.errors.validation,
    },
  )
  .strict();

// GET /api/admin/stats?days=30 (whole days, 7 to 90; missing = 30).
export const StatsQuerySchema = z.object(
  {
    days: optionalText().pipe(
      z
        .string()
        .regex(/^\d{1,3}$/, { error: bg.admin.daysInvalid })
        .transform(Number)
        .pipe(
          z
            .number()
            .min(MIN_STATS_DAYS, { error: bg.admin.daysInvalid })
            .max(MAX_STATS_DAYS, { error: bg.admin.daysInvalid }),
        )
        .optional(),
    ),
  },
  { error: bg.errors.validation },
);

// GET /api/admin/audit-log?cursor=1234 (the id of the last line already shown).
export const AuditQuerySchema = z.object(
  {
    cursor: optionalText().pipe(
      z
        .string()
        .regex(/^[1-9]\d{0,17}$/, { error: bg.admin.cursorInvalid })
        .transform(Number)
        .optional(),
    ),
  },
  { error: bg.errors.validation },
);

// ---------------------------------------------------------------------------------
// Answer shapes (what the API sends to the admin page)
// ---------------------------------------------------------------------------------

// One account in the users list. Phones of protected persons are NOT in the list.
export type AdminUserDto = {
  id: string;
  displayName: string;
  role: AssignableRole;
  email: string | null; // from auth.users, read on the server only
  createdAt: string;
  isSelf: boolean; // the admin who is looking: their own role can't be changed
};

export type AdminUsersPageDto = { users: AdminUserDto[]; nextCursor: string | null };

// The risk levels of a check plus "unfinished" (started, never answered).
export type CheckLevel = RiskLevel | "unfinished";
export const CHECK_LEVELS: CheckLevel[] = ["red", "yellow", "green", "unfinished"];
export type LevelCounts = { red: number; yellow: number; green: number; unfinished: number };

export type ReportStatus = "approved" | "pending" | "rejected";
export const REPORT_STATUSES: ReportStatus[] = ["approved", "pending", "rejected"];
export type StatusCounts = { approved: number; pending: number; rejected: number };

export type AdminStatsDto = {
  days: number;
  from: string; // first day of the period, "YYYY-MM-DD" in Bulgaria
  to: string; // today in Bulgaria
  checksPerDay: ({ date: string } & LevelCounts)[]; // every day, also days with 0
  checksByLevel: LevelCounts;
  checksByScript: { scriptType: ScriptType; count: number }[]; // answered checks only
  reportsByDistrict: ({ districtCode: string; total: number } & StatusCounts)[]; // top 10
  reportsByStatus: StatusCounts;
  totals: { checks: number; reports: number };
  partial: boolean; // true if there were more rows than the server counts at once
};

// One line of the audit log, as the admin sees it.
export type AuditEntryDto = {
  id: number;
  createdAt: string;
  actorName: string | null; // null = no account (a guest, or the account was deleted)
  action: string; // e.g. "role_changed"
  targetType: string | null; // e.g. "profile"
  summary: string; // a short, safe Bulgarian summary of `details` (never ids)
};

export type AuditPageDto = { entries: AuditEntryDto[]; nextCursor: string | null };
