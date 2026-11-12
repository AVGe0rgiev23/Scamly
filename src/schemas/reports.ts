// Input rules (Zod schemas) and answer shapes for the public reports and the scam map
// (BUILD_PLAN 3, #25 and #27; task W3-01):
//
//   createReportSchema(today)  POST /api/reports        an anonymous report of a scam call
//   MapStatsQuerySchema        GET  /api/map/stats      ?weeks=1..12
//   MapStatsDto, …             what GET /api/map/stats sends back
//
// No server-only code here, so the report form (W3-02) and the map (W3-03) can import
// the same rules and types the server uses. A Zod schema is like a Pydantic model.

import { z } from "@/lib/zod";
import { SCRIPT_TYPES, type ScriptType } from "@/engine";
import { normalizePhone } from "@/schemas/contacts";
import { bg } from "@/i18n/bg";

// The 28 district codes BG-01 … BG-28, in the order of bg.districts.
// `keyof typeof` gives the type "one of the keys", like Literal["BG-01", …] in Python.
export type DistrictCode = keyof typeof bg.districts;
export const DISTRICT_CODES = Object.keys(bg.districts) as DistrictCode[];

// Limits of the report form.
export const MAX_DESCRIPTION_LENGTH = 1000; // same as the CHECK in the reports table
export const MAX_REPORT_AGE_DAYS = 90; // older calls are history, not a current wave

// The map shows the last 1 to 12 weeks (the SQL function clamps to the same range).
export const MIN_MAP_WEEKS = 1;
export const MAX_MAP_WEEKS = 12;
export const DEFAULT_MAP_WEEKS = 4;

// ---------------------------------------------------------------------------------
// Dates. A report's date is a calendar day in Bulgaria, written "YYYY-MM-DD".
// ---------------------------------------------------------------------------------

// Today's date in Bulgaria. The server runs in UTC: between midnight and 2–3 a.m.
// Sofia time, the UTC date is still "yesterday", and a call from today would look like
// a call from the future. The "en-CA" format happens to be exactly YYYY-MM-DD.
export function todayInBulgaria(now: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Sofia",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

// "2026-11-09" plus `days` days (negative = back), like date + timedelta(days) in Python.
export function addDays(isoDate: string, days: number): string {
  const date = new Date(`${isoDate}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

// ---------------------------------------------------------------------------------
// POST /api/reports
// ---------------------------------------------------------------------------------

// Only Bulgarian numbers (the form asks for the number that called). Returns E.164
// ("+359888123456") or null, so two spellings of one number give the same hash.
export function normalizeBulgarianPhone(typed: string): string | null {
  const phone = normalizePhone(typed);
  return phone !== null && phone.startsWith("+359") ? phone : null;
}

// The rules need "today", so the schema is built per request by a function: the
// service passes its clock, and the tests pass a fixed day.
// "YYYY-MM-DD" strings can be compared with < and >, like dates.
export function createReportSchema(today: string) {
  const oldestAllowed = addDays(today, -MAX_REPORT_AGE_DAYS);
  return z.object(
    {
      districtCode: z.enum(DISTRICT_CODES, { error: bg.reports.districtInvalid }),
      scriptType: z.enum(SCRIPT_TYPES, { error: bg.reports.scriptInvalid }),
      // z.iso.date() accepts only real calendar days ("2026-02-30" fails).
      occurredOn: z.iso
        .date({ error: bg.reports.dateInvalid })
        .refine((day) => day <= today, { error: bg.reports.dateInFuture })
        .refine((day) => day >= oldestAllowed, { error: bg.reports.dateTooOld }),
      // What happened, optional. Personal data is removed on the server before it is
      // stored (redactPersonalData). "" and null both mean "nothing written".
      description: z
        .string({ error: bg.reports.descriptionTooLong })
        .trim()
        .max(MAX_DESCRIPTION_LENGTH, { error: bg.reports.descriptionTooLong })
        .nullable()
        .optional()
        .transform((text) => (text ? text : null)),
      // The number that called, optional. Only its HMAC is stored, never the number.
      callerNumber: z
        .string({ error: bg.reports.callerNumberInvalid })
        .trim()
        .max(30, { error: bg.reports.callerNumberInvalid })
        .refine((typed) => typed === "" || normalizeBulgarianPhone(typed) !== null, {
          error: bg.reports.callerNumberInvalid,
        })
        .nullable()
        .optional()
        .transform((typed) => (typed ? normalizeBulgarianPhone(typed) : null)),
      // The honeypot: a field that is hidden from people, so only bots fill it in.
      // Any text is ACCEPTED here on purpose: the service then silently drops the
      // report, and a bot can't learn from an error message that it was caught.
      website: z.string({ error: bg.errors.validation }).max(500).optional().default(""),
    },
    { error: bg.errors.validation },
  );
}

// The checked report (like the Python object you get from a Pydantic model).
export type ReportInput = z.infer<ReturnType<typeof createReportSchema>>;

// ---------------------------------------------------------------------------------
// GET /api/map/stats?weeks=4
// ---------------------------------------------------------------------------------

// `weeks` arrives as text in the address; z.coerce.number() turns "4" into 4 (like
// int(...) in Python). Missing -> 4. "0", "13", "2.5" or "abc" -> 400.
export const MapStatsQuerySchema = z.object(
  {
    weeks: z.coerce
      .number({ error: bg.reports.weeksInvalid })
      .int({ error: bg.reports.weeksInvalid })
      .min(MIN_MAP_WEEKS, { error: bg.reports.weeksInvalid })
      .max(MAX_MAP_WEEKS, { error: bg.reports.weeksInvalid })
      .default(DEFAULT_MAP_WEEKS),
  },
  { error: bg.errors.validation },
);

// One "scam wave" (BUILD_PLAN Q10): this script is suddenly frequent in this district.
export type WaveDto = {
  scriptType: ScriptType;
  lastSevenDays: number; // approved reports in the last 7 days
  weeklyAverage: number; // average per week over the 4 weeks before (one decimal)
};

// One district on the map, for the chosen period.
export type DistrictStatsDto = {
  districtCode: DistrictCode;
  total: number; // all approved reports in the period
  byScript: Record<ScriptType, number>; // the same, per script (a dict with 5 keys)
  waves: WaveDto[]; // empty when there is no wave
};

// The whole answer: all 28 districts (also the ones with 0), in code order.
export type MapStatsDto = {
  weeks: number;
  districts: DistrictStatsDto[];
};
