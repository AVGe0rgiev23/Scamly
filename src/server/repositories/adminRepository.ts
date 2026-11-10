// Database queries of the admin area (task W3-06): the users list, the rows behind
// the statistics and the audit log.
//
// Which client each caller passes (BUILD_PLAN 2.4): the admin's own USER client. The
// RLS policies "Admins can read all profiles / checks / reports / the audit log" let
// an admin read these rows, so no secret key is needed for reading, and the database
// checks the admin role a second time. (Role changes are in profilesRepository.ts and
// need the service role; e-mail addresses are in authUsersRepository.ts.)

import type { RiskLevel, ScriptType } from "@/engine";
import type { DbClient } from "@/server/supabase/userClient";
import type { Database, Json } from "@/types/database";

type AppRole = Database["public"]["Enums"]["app_role"];

// One account of the users list (never a phone: role "protected" is left out).
export type AdminProfileRow = {
  id: string;
  role: AppRole;
  display_name: string;
  created_at: string;
};

// What the users list may filter by.
export type ProfileFilter = {
  nameContains?: string; // part of the display name (already cleaned by the service)
  ids?: string[]; // only these accounts (search by e-mail)
  role?: AppRole;
};

// One page of accounts, newest first. Asks for `limit + 1` rows, so the caller knows
// whether there is another page. `offset` = rows already shown.
export async function listProfilesPage(
  client: DbClient,
  filter: ProfileFilter,
  offset: number,
  limit: number,
): Promise<AdminProfileRow[]> {
  let query = client
    .from("profiles")
    .select("id, role, display_name, created_at")
    .neq("role", "protected");
  if (filter.role !== undefined) {
    query = query.eq("role", filter.role);
  }
  if (filter.nameContains !== undefined) {
    query = query.ilike("display_name", `%${filter.nameContains}%`);
  }
  if (filter.ids !== undefined) {
    query = query.in("id", filter.ids);
  }
  const { data, error } = await query
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .range(offset, offset + limit); // both ends included: limit + 1 rows
  if (error) {
    throw new Error(`listProfilesPage failed: ${error.message}`);
  }
  return data;
}

// ---------------------------------------------------------------------------------
// Statistics. We read only the few columns we count, for the period, page by page
// (Supabase answers at most 1000 rows per request), and count them in TypeScript.
// ---------------------------------------------------------------------------------

export const STATS_PAGE_ROWS = 1000;

export type StatsCheckRow = {
  started_at: string;
  risk_level: RiskLevel | null; // null = started, never answered
  script_type: ScriptType | null;
};

export type StatsReportRow = {
  submitted_at: string;
  district_code: string;
  status: Database["public"]["Enums"]["report_status"];
};

// One page (`page` = 0, 1, 2…) of the checks started at or after `sinceIso`.
export async function fetchCheckStatsPage(
  client: DbClient,
  sinceIso: string,
  page: number,
): Promise<StatsCheckRow[]> {
  const from = page * STATS_PAGE_ROWS;
  const { data, error } = await client
    .from("checks")
    .select("started_at, risk_level, script_type")
    .gte("started_at", sinceIso)
    .order("id")
    .range(from, from + STATS_PAGE_ROWS - 1);
  if (error) {
    throw new Error(`fetchCheckStatsPage failed: ${error.message}`);
  }
  return data;
}

// One page of the public reports submitted at or after `sinceIso` (any status).
export async function fetchReportStatsPage(
  client: DbClient,
  sinceIso: string,
  page: number,
): Promise<StatsReportRow[]> {
  const from = page * STATS_PAGE_ROWS;
  const { data, error } = await client
    .from("reports")
    .select("submitted_at, district_code, status")
    .gte("submitted_at", sinceIso)
    .order("id")
    .range(from, from + STATS_PAGE_ROWS - 1);
  if (error) {
    throw new Error(`fetchReportStatsPage failed: ${error.message}`);
  }
  return data;
}

// ---------------------------------------------------------------------------------
// Audit log
// ---------------------------------------------------------------------------------

export type AuditRow = {
  id: number;
  actor_id: string | null;
  action: string;
  target_type: string | null;
  details: Json;
  created_at: string;
};

// Newest first; `beforeId` = the last id already shown (the ids only grow, so this is
// a stable "next page" even while new lines are being added). Asks for limit + 1.
export async function listAuditPage(
  client: DbClient,
  beforeId: number | undefined,
  limit: number,
): Promise<AuditRow[]> {
  let query = client
    .from("audit_log")
    .select("id, actor_id, action, target_type, details, created_at");
  if (beforeId !== undefined) {
    query = query.lt("id", beforeId);
  }
  const { data, error } = await query.order("id", { ascending: false }).limit(limit + 1);
  if (error) {
    throw new Error(`listAuditPage failed: ${error.message}`);
  }
  return data;
}

// The display names of some accounts (the people in one page of the audit log).
export async function findDisplayNames(
  client: DbClient,
  ids: string[],
): Promise<Map<string, string>> {
  const names = new Map<string, string>();
  if (ids.length === 0) {
    return names;
  }
  const { data, error } = await client.from("profiles").select("id, display_name").in("id", ids);
  if (error) {
    throw new Error(`findDisplayNames failed: ${error.message}`);
  }
  for (const row of data) {
    names.set(row.id, row.display_name);
  }
  return names;
}
