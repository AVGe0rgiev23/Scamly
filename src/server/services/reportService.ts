// Anonymous public reports of scam calls: POST /api/reports (task W3-01,
// BUILD_PLAN 3 #27, brief 5.2 D). Anyone may send one, without an account.
//
// The steps of submitReport():
//   1. check the input (Zod, 400)
//   2. rate limit: 3 per IP per hour (the IP only as an HMAC, never stored)
//   3. honeypot: a hidden field "website" that only bots fill in. Filled -> we answer
//      exactly like for a real report, but store NOTHING (the bot learns nothing)
//   4. global cap: 100 stored reports per hour from everybody together
//   5. remove personal data from the description (redactPersonalData), turn the
//      caller's number into an HMAC with HASH_PEPPER, and store the report as
//      "pending" with the admin client. A moderator approves it before it counts on
//      the map.
//
// Like the other services, everything from the outside world comes in `deps`
// (dependency injection), so the unit tests run with fakes and no database.

import "server-only";
import { redactPersonalData } from "@/engine";
import { getServerEnv } from "@/lib/env";
import { createReportSchema, todayInBulgaria, MAX_DESCRIPTION_LENGTH } from "@/schemas/reports";
import { insertReport, type NewReport } from "@/server/repositories/reportsRepository";
import { hmacSha256 } from "@/server/security/hash";
import {
  databaseHitCounter,
  enforceRateLimit,
  ipKey,
  RATE_LIMITS,
  type HitCounter,
} from "@/server/security/rateLimit";
import type { DbClient } from "@/server/supabase/userClient";

// Everything the service needs from the outside world (tests pass fakes).
export type ReportDeps = {
  now: () => Date;
  hashPepper: string; // secret for the IP and phone number HMACs (HASH_PEPPER)
  hitCounter: HitCounter;
  insertReport: (report: NewReport) => Promise<void>;
};

// The answer is the same for every accepted report, real or honeypot: no id, nothing
// a bot could compare.
export type SubmitReportResult = { ok: true };

export async function submitReport(
  deps: ReportDeps,
  body: unknown,
  ip: string,
): Promise<SubmitReportResult> {
  // 1. Input. "Today" is the Bulgarian date (see todayInBulgaria). A typo costs the
  //    person nothing: wrong input is rejected before it counts against the limit.
  const input = createReportSchema(todayInBulgaria(deps.now())).parse(body);

  // 2. At most 3 reports per IP per hour. A bot caught by the honeypot counts too,
  //    so its answers look exactly like a real person's (including the 429).
  const perIp = RATE_LIMITS.reportPerIp;
  await enforceRateLimit(deps.hitCounter, perIp, ipKey(perIp, ip, deps.hashPepper));

  // 3. Honeypot filled in: pretend all is well and drop the report silently.
  if (input.website.trim() !== "") {
    return { ok: true };
  }

  // 4. The global cap counts only reports we are about to store, so bots caught by
  //    the honeypot can't use it up and block real people.
  const global = RATE_LIMITS.reportGlobal;
  await enforceRateLimit(deps.hitCounter, global, global.name);

  // 5. No personal data in the database: redact the text, hash the number.
  //    A replacement label like [ИМЕЙЛ] can be 1 character longer than what it
  //    replaces, so we cut to the column's limit to be safe.
  const descriptionRedacted =
    input.description === null
      ? null
      : redactPersonalData(input.description).slice(0, MAX_DESCRIPTION_LENGTH);
  const callerNumberHash =
    input.callerNumber === null ? null : hmacSha256(input.callerNumber, deps.hashPepper);

  await deps.insertReport({
    districtCode: input.districtCode,
    scriptType: input.scriptType,
    occurredOn: input.occurredOn,
    descriptionRedacted,
    callerNumberHash,
  });
  return { ok: true };
}

// The real deps: storing and counting both need the admin client (BUILD_PLAN 2.4,
// uses 5 and 7), because guests have no INSERT right on `reports`.
export function createReportDeps(admin: DbClient): ReportDeps {
  return {
    now: () => new Date(),
    hashPepper: getServerEnv().HASH_PEPPER,
    hitCounter: databaseHitCounter(admin),
    insertReport: (report) => insertReport(admin, report),
  };
}
