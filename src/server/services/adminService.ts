// The admin area's logic (task W3-06, BUILD_PLAN 3 #32–#35):
//
//   listUsers()     GET   /api/admin/users?q&role&cursor   accounts (no phones), 25 per page
//   changeRole()    PATCH /api/admin/users/:id/role        audited "role_changed"
//   getStats()      GET   /api/admin/stats?days=7..90      numbers for the charts
//   listAuditLog()  GET   /api/admin/audit-log?cursor      newest first, 50 per page
//
// The route has already checked that the caller is an admin (requireRole). Reading
// uses the admin's own USER client: RLS "Admins can read all …" checks the role a
// second time in the database. The service role (admin client) is used only where RLS
// must not allow it to anybody (BUILD_PLAN 2.4 use 6): changing a role, writing the
// audit line and reading e-mail addresses from auth.users.
//
// Like the other services, the outside world comes in `deps`, so the unit tests use
// fakes and no database (dependency injection).

import "server-only";
import { fill } from "@/components/family/format";
import { bg } from "@/i18n/bg";
import {
  AUDIT_PAGE_SIZE,
  AuditQuerySchema,
  ChangeRoleSchema,
  DEFAULT_STATS_DAYS,
  StatsQuerySchema,
  USERS_PAGE_SIZE,
  UsersQuerySchema,
  type AdminStatsDto,
  type AdminUserDto,
  type AdminUsersPageDto,
  type AssignableRole,
  type AuditPageDto,
} from "@/schemas/admin";
import type { Actor } from "@/server/auth/actor";
import { conflict, notFound } from "@/server/http/errors";
import {
  fetchCheckStatsPage,
  fetchReportStatsPage,
  findDisplayNames,
  listAuditPage,
  listProfilesPage,
  STATS_PAGE_ROWS,
  type AdminProfileRow,
  type AuditRow,
  type ProfileFilter,
  type StatsCheckRow,
  type StatsReportRow,
} from "@/server/repositories/adminRepository";
import { writeAudit, type AuditEntry } from "@/server/repositories/auditRepository";
import { findAuthUserEmail, listAuthEmails } from "@/server/repositories/authUsersRepository";
import { changeProfileRole, findProfileById } from "@/server/repositories/profilesRepository";
import type { DbClient } from "@/server/supabase/userClient";
import { shapeStats, statsPeriod } from "./adminStats";
import { summarizeAuditDetails } from "./auditSummary";

// At most this many rows are counted per table for one statistics answer (20 pages of
// 1000). More than that sets `partial: true`, and the page says so.
export const MAX_STATS_PAGES = 20;

// Everything the service needs from the outside world (tests pass fakes).
export type AdminDeps = {
  now: () => Date;
  listProfiles: (
    filter: ProfileFilter,
    offset: number,
    limit: number,
  ) => Promise<AdminProfileRow[]>;
  findProfile: (id: string) => Promise<AdminProfileRow | null>;
  listEmails: () => Promise<Map<string, string>>; // admin client
  findEmail: (id: string) => Promise<string | null>; // admin client
  changeRole: (id: string, from: AdminProfileRow["role"], to: AssignableRole) => Promise<boolean>;
  checkStatsPage: (sinceIso: string, page: number) => Promise<StatsCheckRow[]>;
  reportStatsPage: (sinceIso: string, page: number) => Promise<StatsReportRow[]>;
  listAudit: (beforeId: number | undefined, limit: number) => Promise<AuditRow[]>;
  findNames: (ids: string[]) => Promise<Map<string, string>>;
  writeAudit: (entry: AuditEntry) => Promise<void>;
};

// ---------------------------------------------------------------------------------
// Users
// ---------------------------------------------------------------------------------

// Takes out the characters that mean "any text" in a LIKE pattern (% _ *) and the
// backslash, so a search for „50%“ can't turn into "everything".
export function cleanNameSearch(q: string): string {
  return q.replace(/[%_*\\]/g, "").trim();
}

function toUserDto(row: AdminProfileRow, email: string | null, actor: Actor): AdminUserDto {
  return {
    id: row.id,
    displayName: row.display_name,
    // The list never holds phones (the query leaves them out), so this is one of the
    // three roles an admin may give.
    role: row.role === "protected" ? "family" : row.role,
    email,
    createdAt: row.created_at,
    isSelf: row.id === actor.userId,
  };
}

export async function listUsers(
  deps: AdminDeps,
  actor: Actor,
  query: unknown,
): Promise<AdminUsersPageDto> {
  const input = UsersQuerySchema.parse(query); // 400 with a Bulgarian message
  const offset = input.cursor ?? 0;
  const emails = await deps.listEmails();

  const filter: ProfileFilter = { role: input.role };
  if (input.q !== undefined) {
    if (input.q.includes("@")) {
      // Search by e-mail: the addresses live in auth.users, so find the ids first.
      const needle = input.q.toLowerCase();
      const ids = [...emails.entries()]
        .filter(([, email]) => email.toLowerCase().includes(needle))
        .map(([id]) => id)
        .slice(0, 200);
      if (ids.length === 0) {
        return { users: [], nextCursor: null };
      }
      filter.ids = ids;
    } else {
      const name = cleanNameSearch(input.q);
      if (name !== "") {
        filter.nameContains = name;
      }
    }
  }

  const rows = await deps.listProfiles(filter, offset, USERS_PAGE_SIZE);
  const page = rows.slice(0, USERS_PAGE_SIZE);
  return {
    users: page.map((row) => toUserDto(row, emails.get(row.id) ?? null, actor)),
    nextCursor: rows.length > USERS_PAGE_SIZE ? String(offset + USERS_PAGE_SIZE) : null,
  };
}

// PATCH /api/admin/users/:id/role. The rules, in this order:
//   1. a valid body { role: family | moderator | admin }           else 400
//   2. not the admin's own account                                  else 409 own_role
//   3. the account exists (RLS read with the admin's client)        else 404
//   4. not a phone of a protected person                            else 409 device_account
//   5. the same role again: nothing to do, no audit line            200
//   6. change it only if it is still the role we read (admin client) else 409
//   7. audit line "role_changed" { from, to } (roles only, no names)
export async function changeRole(
  deps: AdminDeps,
  actor: Actor,
  targetId: string,
  body: unknown,
): Promise<AdminUserDto> {
  const { role } = ChangeRoleSchema.parse(body);

  if (targetId === actor.userId) {
    throw conflict("own_role", bg.admin.ownRole);
  }

  const target = await deps.findProfile(targetId);
  if (target === null) {
    throw notFound();
  }
  if (target.role === "protected") {
    throw conflict("device_account", bg.admin.deviceAccount);
  }

  const email = await deps.findEmail(target.id);
  if (target.role === role) {
    return toUserDto(target, email, actor);
  }

  const oldRole = target.role; // kept before the change, for the audit line
  const changed = await deps.changeRole(target.id, oldRole, role);
  if (!changed) {
    throw conflict("role_changed_meanwhile", bg.admin.roleChangedMeanwhile);
  }

  await deps.writeAudit({
    actorId: actor.userId,
    action: "role_changed",
    targetType: "profile",
    targetId: target.id,
    details: { from: oldRole, to: role },
  });
  return toUserDto({ ...target, role }, email, actor);
}

// ---------------------------------------------------------------------------------
// Statistics
// ---------------------------------------------------------------------------------

// Reads every page of rows (at most MAX_STATS_PAGES). `partial` = there were more.
async function readAllPages<T>(
  readPage: (page: number) => Promise<T[]>,
): Promise<{ rows: T[]; partial: boolean }> {
  const rows: T[] = [];
  for (let page = 0; page < MAX_STATS_PAGES; page += 1) {
    const batch = await readPage(page);
    rows.push(...batch);
    if (batch.length < STATS_PAGE_ROWS) {
      return { rows, partial: false };
    }
  }
  return { rows, partial: true };
}

export async function getStats(deps: AdminDeps, query: unknown): Promise<AdminStatsDto> {
  const input = StatsQuerySchema.parse(query);
  const period = statsPeriod(deps.now(), input.days ?? DEFAULT_STATS_DAYS);
  // Both tables at the same time (like asyncio.gather).
  const [checks, reports] = await Promise.all([
    readAllPages((page) => deps.checkStatsPage(period.sinceIso, page)),
    readAllPages((page) => deps.reportStatsPage(period.sinceIso, page)),
  ]);
  return shapeStats({
    period,
    checks: checks.rows,
    reports: reports.rows,
    partial: checks.partial || reports.partial,
  });
}

// ---------------------------------------------------------------------------------
// Audit log
// ---------------------------------------------------------------------------------

export async function listAuditLog(deps: AdminDeps, query: unknown): Promise<AuditPageDto> {
  const input = AuditQuerySchema.parse(query);
  const rows = await deps.listAudit(input.cursor, AUDIT_PAGE_SIZE);
  const page = rows.slice(0, AUDIT_PAGE_SIZE);

  const actorIds = [
    ...new Set(page.flatMap((row) => (row.actor_id === null ? [] : [row.actor_id]))),
  ];
  const names = await deps.findNames(actorIds);

  const last = page[page.length - 1];
  return {
    entries: page.map((row) => ({
      id: row.id,
      createdAt: row.created_at,
      actorName: row.actor_id === null ? null : (names.get(row.actor_id) ?? null),
      action: row.action,
      targetType: row.target_type,
      summary: summarizeAuditDetails(row.details),
    })),
    nextCursor: rows.length > AUDIT_PAGE_SIZE && last !== undefined ? String(last.id) : null,
  };
}

// The message after a successful change, e.g. „Ролята на Иван вече е „Модератор“.“
export function roleChangedMessage(user: AdminUserDto): string {
  return fill(bg.admin.roleChanged, {
    name: user.displayName,
    role: bg.admin.roleNames[user.role],
  });
}

// ---------------------------------------------------------------------------------
// The real deps. `client` is the admin's user client; `admin` (service role) is
// created only when a step needs it.
// ---------------------------------------------------------------------------------
export function createAdminDeps(client: DbClient, admin: () => DbClient): AdminDeps {
  return {
    now: () => new Date(),
    listProfiles: (filter, offset, limit) => listProfilesPage(client, filter, offset, limit),
    findProfile: (id) => findProfileById(client, id),
    listEmails: () => listAuthEmails(admin()),
    findEmail: (id) => findAuthUserEmail(admin(), id),
    changeRole: (id, from, to) => changeProfileRole(admin(), id, from, to),
    checkStatsPage: (sinceIso, page) => fetchCheckStatsPage(client, sinceIso, page),
    reportStatsPage: (sinceIso, page) => fetchReportStatsPage(client, sinceIso, page),
    listAudit: (beforeId, limit) => listAuditPage(client, beforeId, limit),
    findNames: (ids) => findDisplayNames(client, ids),
    writeAudit: (entry) => writeAudit(admin(), entry),
  };
}
