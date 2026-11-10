// Unit tests for the admin area's service (adminService.ts, W3-06) with in-memory
// fakes instead of Supabase. The real RLS rules (only admins read all profiles and the
// audit log; nobody changes their own role; the audit log is append-only) are tested
// in supabase/tests/02_profiles and 07_admin_audit.

import { describe, expect, it } from "vitest";
import { ZodError } from "zod";
import { bg } from "@/i18n/bg";
import type { Actor } from "@/server/auth/actor";
import { checkRole } from "@/server/auth/requireRole";
import { ApiError } from "@/server/http/errors";
import type {
  AdminProfileRow,
  AuditRow,
  StatsCheckRow,
} from "@/server/repositories/adminRepository";
import type { AuditEntry } from "@/server/repositories/auditRepository";
import {
  changeRole,
  cleanNameSearch,
  getStats,
  listAuditLog,
  listUsers,
  MAX_STATS_PAGES,
  roleChangedMessage,
  type AdminDeps,
} from "@/server/services/adminService";

const ADMIN_ID = "a0000000-0000-4000-8000-000000000001";
const FAMILY_ID = "f0000000-0000-4000-8000-000000000002";
const MOD_ID = "b0000000-0000-4000-8000-000000000003";
const PHONE_ID = "d0000000-0000-4000-8000-000000000004";

function actorOf(userId: string, role: Actor["role"]): Actor {
  return {
    userId,
    role,
    profile: { id: userId, role, display_name: "x", email_alerts: true, created_at: "" },
    device: null,
  };
}
const ADMIN = actorOf(ADMIN_ID, "admin");

function profiles(): AdminProfileRow[] {
  return [
    { id: ADMIN_ID, role: "admin", display_name: "Анна Админ", created_at: "2026-11-03T00:00:00Z" },
    {
      id: FAMILY_ID,
      role: "family",
      display_name: "Мария Петрова",
      created_at: "2026-11-02T00:00:00Z",
    },
    { id: MOD_ID, role: "moderator", display_name: "Иван Мод", created_at: "2026-11-01T00:00:00Z" },
    {
      id: PHONE_ID,
      role: "protected",
      display_name: "Баба Гена",
      created_at: "2026-11-01T00:00:00Z",
    },
  ];
}

// The fake world: the profiles table, the e-mails, the audit lines written.
function fakeDeps(overrides: Partial<AdminDeps> = {}) {
  const rows = profiles();
  const audit: AuditEntry[] = [];
  const roleChanges: { id: string; from: string; to: string }[] = [];
  const filters: unknown[] = [];
  const emails = new Map([
    [ADMIN_ID, "admin@demo.scamly.invalid"],
    [FAMILY_ID, "maria@example.com"],
    [MOD_ID, "ivan@example.com"],
    [PHONE_ID, "device-1@devices.scamly.invalid"],
  ]);
  const deps: AdminDeps = {
    now: () => new Date("2026-11-09T10:00:00Z"),
    listProfiles: async (filter, offset, limit) => {
      filters.push(filter);
      return rows
        .filter((row) => row.role !== "protected")
        .filter((row) => filter.role === undefined || row.role === filter.role)
        .filter((row) => filter.ids === undefined || filter.ids.includes(row.id))
        .filter(
          (row) =>
            filter.nameContains === undefined ||
            row.display_name.toLowerCase().includes(filter.nameContains.toLowerCase()),
        )
        .slice(offset, offset + limit + 1);
    },
    findProfile: async (id) => rows.find((row) => row.id === id) ?? null,
    listEmails: async () => emails,
    findEmail: async (id) => emails.get(id) ?? null,
    changeRole: async (id, from, to) => {
      roleChanges.push({ id, from, to });
      const row = rows.find((r) => r.id === id);
      if (row === undefined || row.role !== from) return false;
      row.role = to;
      return true;
    },
    checkStatsPage: async () => [],
    reportStatsPage: async () => [],
    listAudit: async () => [],
    findNames: async () => new Map(),
    writeAudit: async (entry) => {
      audit.push(entry);
    },
    ...overrides,
  };
  return { deps, audit, roleChanges, filters, rows };
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

describe("who may use the admin API", () => {
  it("only an admin: a guest gets 401, every other role 403", () => {
    expect(() => checkRole(null, ["admin"])).toThrow(expect.objectContaining({ status: 401 }));
    for (const role of ["family", "moderator", "protected"] as const) {
      expect(() => checkRole(actorOf("x", role), ["admin"])).toThrow(
        expect.objectContaining({ status: 403 }),
      );
    }
    expect(checkRole(ADMIN, ["admin"])).toBe(ADMIN);
  });
});

describe("listUsers", () => {
  it("lists accounts with e-mail, never phones, and marks the admin's own row", async () => {
    const { deps } = fakeDeps();
    const page = await listUsers(deps, ADMIN, {});
    expect(page.users.map((user) => user.id)).toEqual([ADMIN_ID, FAMILY_ID, MOD_ID]);
    expect(page.users[1]).toEqual({
      id: FAMILY_ID,
      displayName: "Мария Петрова",
      role: "family",
      email: "maria@example.com",
      createdAt: "2026-11-02T00:00:00Z",
      isSelf: false,
    });
    expect(page.users[0]?.isSelf).toBe(true);
    expect(page.nextCursor).toBeNull();
  });

  it("searches by name (LIKE wildcards removed) or by e-mail with „@“, and by role", async () => {
    const { deps, filters } = fakeDeps();
    expect((await listUsers(deps, ADMIN, { q: "мари%" })).users.map((u) => u.id)).toEqual([
      FAMILY_ID,
    ]);
    expect(filters[0]).toEqual({ role: undefined, nameContains: "мари" });

    expect((await listUsers(deps, ADMIN, { q: "IVAN@" })).users.map((u) => u.id)).toEqual([MOD_ID]);
    expect((await listUsers(deps, ADMIN, { q: "nobody@" })).users).toEqual([]);
    // A phone's address matches the search, but phones never appear.
    expect((await listUsers(deps, ADMIN, { q: "@devices" })).users).toEqual([]);

    expect((await listUsers(deps, ADMIN, { role: "moderator" })).users.map((u) => u.id)).toEqual([
      MOD_ID,
    ]);
    expect(cleanNameSearch(" 5_0*%\\ ")).toBe("50");
  });

  it("pages by 25 with a cursor", async () => {
    const many: AdminProfileRow[] = Array.from({ length: 30 }, (_, i) => ({
      id: `u-${i}`,
      role: "family",
      display_name: `Човек ${i}`,
      created_at: "2026-11-01T00:00:00Z",
    }));
    const { deps } = fakeDeps({
      listProfiles: async (_filter, offset, limit) => many.slice(offset, offset + limit + 1),
    });
    const first = await listUsers(deps, ADMIN, {});
    expect(first.users).toHaveLength(25);
    expect(first.nextCursor).toBe("25");
    const second = await listUsers(deps, ADMIN, { cursor: "25" });
    expect(second.users.map((u) => u.id)).toEqual(["u-25", "u-26", "u-27", "u-28", "u-29"]);
    expect(second.nextCursor).toBeNull();
  });

  it("rejects an invalid role filter or cursor with a Bulgarian message", async () => {
    const { deps } = fakeDeps();
    const bad = await failure(listUsers(deps, ADMIN, { role: "protected" }));
    expect(bad).toBeInstanceOf(ZodError);
    expect((bad as ZodError).issues[0]?.message).toBe(bg.admin.roleInvalid);
    expect(await failure(listUsers(deps, ADMIN, { cursor: "-1" }))).toBeInstanceOf(ZodError);
  });
});

describe("changeRole", () => {
  it("changes the role with the service role and writes one audit line without names", async () => {
    const { deps, audit, roleChanges } = fakeDeps();
    const user = await changeRole(deps, ADMIN, FAMILY_ID, { role: "moderator" });
    expect(user).toMatchObject({ id: FAMILY_ID, role: "moderator", email: "maria@example.com" });
    expect(roleChanges).toEqual([{ id: FAMILY_ID, from: "family", to: "moderator" }]);
    expect(audit).toEqual([
      {
        actorId: ADMIN_ID,
        action: "role_changed",
        targetType: "profile",
        targetId: FAMILY_ID,
        details: { from: "family", to: "moderator" },
      },
    ]);
    expect(JSON.stringify(audit)).not.toContain("Мария");
    expect(roleChangedMessage(user)).toBe("Ролята на Мария Петрова вече е „Модератор“.");
  });

  it("an admin can't change their own role (409), and nothing is written", async () => {
    const { deps, audit, roleChanges } = fakeDeps();
    for (const role of ["family", "moderator", "admin"]) {
      const error = await apiFailure(changeRole(deps, ADMIN, ADMIN_ID, { role }));
      expect(error.status).toBe(409);
      expect(error.code).toBe("own_role");
      expect(error.messageBg).toBe(bg.admin.ownRole);
    }
    expect(roleChanges).toEqual([]);
    expect(audit).toEqual([]);
  });

  it("a phone of a protected person can't be changed (409)", async () => {
    const { deps, audit, roleChanges } = fakeDeps();
    const error = await apiFailure(changeRole(deps, ADMIN, PHONE_ID, { role: "admin" }));
    expect(error.status).toBe(409);
    expect(error.code).toBe("device_account");
    expect(roleChanges).toEqual([]);
    expect(audit).toEqual([]);
  });

  it("never gives the role „protected“, and rejects unknown fields (400)", async () => {
    const { deps, roleChanges } = fakeDeps();
    expect(await failure(changeRole(deps, ADMIN, FAMILY_ID, { role: "protected" }))).toBeInstanceOf(
      ZodError,
    );
    expect(
      await failure(changeRole(deps, ADMIN, FAMILY_ID, { role: "admin", userId: ADMIN_ID })),
    ).toBeInstanceOf(ZodError);
    expect(await failure(changeRole(deps, ADMIN, FAMILY_ID, {}))).toBeInstanceOf(ZodError);
    expect(roleChanges).toEqual([]);
  });

  it("an unknown account is 404; the same role again changes and logs nothing", async () => {
    const { deps, audit, roleChanges } = fakeDeps();
    const missing = await apiFailure(
      changeRole(deps, ADMIN, "00000000-0000-4000-8000-000000000000", { role: "admin" }),
    );
    expect(missing.status).toBe(404);
    const same = await changeRole(deps, ADMIN, MOD_ID, { role: "moderator" });
    expect(same.role).toBe("moderator");
    expect(roleChanges).toEqual([]);
    expect(audit).toEqual([]);
  });

  it("another admin changed it meanwhile: 409 and no audit line", async () => {
    const { deps, audit } = fakeDeps({ changeRole: async () => false });
    const error = await apiFailure(changeRole(deps, ADMIN, FAMILY_ID, { role: "admin" }));
    expect(error.status).toBe(409);
    expect(error.code).toBe("role_changed_meanwhile");
    expect(audit).toEqual([]);
  });

  it("a failed audit write fails the request (no silent, unlogged change)", async () => {
    const { deps } = fakeDeps({
      writeAudit: async () => {
        throw new Error("audit down");
      },
    });
    expect(await failure(changeRole(deps, ADMIN, FAMILY_ID, { role: "admin" }))).toEqual(
      new Error("audit down"),
    );
  });
});

describe("getStats", () => {
  it("reads every page, both tables, from the day before the period", async () => {
    const sinces: string[] = [];
    const full: StatsCheckRow[] = Array.from({ length: 1000 }, () => ({
      started_at: "2026-11-09T08:00:00Z",
      risk_level: "red",
      script_type: "police",
    }));
    const { deps } = fakeDeps({
      checkStatsPage: async (since, page) => {
        sinces.push(since);
        return page === 0 ? full : full.slice(0, 5);
      },
    });
    const stats = await getStats(deps, { days: "7" });
    expect(sinces).toEqual(["2026-11-02T00:00:00.000Z", "2026-11-02T00:00:00.000Z"]);
    expect(stats.from).toBe("2026-11-03");
    expect(stats.to).toBe("2026-11-09");
    expect(stats.totals.checks).toBe(1005);
    expect(stats.partial).toBe(false);
  });

  it("stops after the page limit and says the numbers are partial", async () => {
    const full: StatsCheckRow[] = Array.from({ length: 1000 }, () => ({
      started_at: "2026-11-09T08:00:00Z",
      risk_level: null,
      script_type: null,
    }));
    let calls = 0;
    const { deps } = fakeDeps({
      checkStatsPage: async () => {
        calls += 1;
        return full;
      },
    });
    const stats = await getStats(deps, {});
    expect(calls).toBe(MAX_STATS_PAGES);
    expect(stats.partial).toBe(true);
    expect(stats.days).toBe(30);
  });

  it("accepts 7..90 days only", async () => {
    const { deps } = fakeDeps();
    for (const days of ["6", "91", "abc", "7.5"]) {
      const error = await failure(getStats(deps, { days }));
      expect(error).toBeInstanceOf(ZodError);
      expect((error as ZodError).issues[0]?.message).toBe(bg.admin.daysInvalid);
    }
    expect((await getStats(deps, { days: "90" })).checksPerDay).toHaveLength(90);
  });
});

describe("listAuditLog", () => {
  function auditRows(count: number, firstId: number): AuditRow[] {
    return Array.from({ length: count }, (_, i) => ({
      id: firstId - i,
      actor_id: i % 2 === 0 ? ADMIN_ID : null,
      action: "role_changed",
      target_type: "profile",
      details: { from: "family", to: "admin", secret_id: "abc" },
      created_at: "2026-11-09T10:00:00Z",
    }));
  }

  it("newest first, 50 per page, actor names, a safe summary and the next cursor", async () => {
    const calls: (number | undefined)[] = [];
    const { deps } = fakeDeps({
      listAudit: async (beforeId, limit) => {
        calls.push(beforeId);
        return auditRows(limit + 1, beforeId === undefined ? 100 : beforeId - 1);
      },
      findNames: async (ids) => new Map(ids.map((id) => [id, "Анна Админ"])),
    });
    const page = await listAuditLog(deps, {});
    expect(page.entries).toHaveLength(50);
    expect(page.entries[0]).toEqual({
      id: 100,
      createdAt: "2026-11-09T10:00:00Z",
      actorName: "Анна Админ",
      action: "role_changed",
      targetType: "profile",
      summary: "Семейство → Администратор",
    });
    expect(page.entries[1]?.actorName).toBeNull();
    expect(page.nextCursor).toBe("51");
    expect(JSON.stringify(page)).not.toContain("abc");

    await listAuditLog(deps, { cursor: "51" });
    expect(calls).toEqual([undefined, 51]);
  });

  it("the last page has no cursor; a bad cursor is 400", async () => {
    const { deps } = fakeDeps({ listAudit: async () => auditRows(3, 3) });
    expect((await listAuditLog(deps, { cursor: "4" })).nextCursor).toBeNull();
    expect(await failure(listAuditLog(deps, { cursor: "0" }))).toBeInstanceOf(ZodError);
    expect(await failure(listAuditLog(deps, { cursor: "x" }))).toBeInstanceOf(ZodError);
  });
});
