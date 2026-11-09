// Database queries for the public reports (table `reports`, SQL function
// get_map_stats; task W3-01).
//
// Two kinds of callers:
//   * insertReport() uses the ADMIN client (BUILD_PLAN 2.4, use 5): guests have NO
//     insert policy on `reports` on purpose, so the only way in is our API with its
//     rate limiter and honeypot.
//   * fetchMapStats() uses the PUBLIC client: get_map_stats() is open to guests and
//     returns only counts of approved reports.

import type { ScriptType } from "@/engine";
import type { DbClient } from "@/server/supabase/userClient";

// A report as the service stores it: personal data already removed, the caller's
// number already turned into an HMAC. The status is always the default, "pending".
export type NewReport = {
  districtCode: string;
  scriptType: ScriptType;
  occurredOn: string; // "YYYY-MM-DD"
  descriptionRedacted: string | null;
  callerNumberHash: string | null;
};

// One row of get_map_stats(weeks): approved reports per district, script and week.
export type MapStatsRow = {
  district_code: string;
  script_type: ScriptType;
  week_start: string; // the Monday of the week, "YYYY-MM-DD"
  report_count: number;
};

// Stores one report (admin client). We don't even ask for the new id back: the guest
// gets none, and nothing else needs it.
export async function insertReport(admin: DbClient, report: NewReport): Promise<void> {
  const { error } = await admin.from("reports").insert({
    district_code: report.districtCode,
    script_type: report.scriptType,
    occurred_on: report.occurredOn,
    description_redacted: report.descriptionRedacted,
    caller_number_hash: report.callerNumberHash,
  });
  if (error) {
    throw new Error(`insertReport failed: ${error.message}`);
  }
}

// Calls get_map_stats(weeks) (public client). The count is a PostgreSQL bigint;
// Number() makes sure we get a plain number even if it arrives as text.
export async function fetchMapStats(client: DbClient, weeks: number): Promise<MapStatsRow[]> {
  const { data, error } = await client.rpc("get_map_stats", { weeks });
  if (error) {
    throw new Error(`fetchMapStats failed: ${error.message}`);
  }
  return data.map((row) => ({ ...row, report_count: Number(row.report_count) }));
}
