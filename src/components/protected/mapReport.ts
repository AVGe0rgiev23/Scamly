// „Изпратете анонимно на картата“ (P-11): the report the protected phone sends to
// POST /api/reports from a red screen. Pure helpers (no React, no network), so they
// are unit-tested in mapReport.test.ts.
//
// Only what the map needs and the phone already knows: the district of the person
// (or the one she picks) and the kind of scam. Never a phone number, a name or the
// text of the call; the date is today in Bulgaria. The API checks it all again.

import type { ScriptType } from "@/engine";
import { DISTRICT_CODES, todayInBulgaria, type DistrictCode } from "@/schemas/reports";

// The body of POST /api/reports, in the shape createReportSchema() expects.
// Like a small Python TypedDict.
export type MapReportBody = {
  districtCode: DistrictCode;
  scriptType: ScriptType;
  occurredOn: string; // "YYYY-MM-DD", today in Bulgaria
  description: null; // no words of the call: they could hold names or numbers
  callerNumber: null; // never the calling number
  website: ""; // the honeypot stays empty (people never see it)
};

// Which script a red screen reports. „Не съм аз“ means somebody pretended to be
// someone close: the "relative in trouble" script, whatever else was said.
export function scriptForIdentityNotMe(): ScriptType {
  return "relative_in_trouble";
}

// A text from a <select> -> a district code, or null for anything else ("").
// `find` returns the matching code or undefined, like `value if value in CODES else None`.
export function asDistrictCode(value: string | null | undefined): DistrictCode | null {
  return DISTRICT_CODES.find((code) => code === value) ?? null;
}

export function buildMapReport(input: {
  districtCode: DistrictCode;
  scriptType: ScriptType;
  now: Date;
}): MapReportBody {
  return {
    districtCode: input.districtCode,
    scriptType: input.scriptType,
    occurredOn: todayInBulgaria(input.now),
    description: null,
    callerNumber: null,
    website: "",
  };
}
