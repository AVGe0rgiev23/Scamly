// Unit tests for the report and map-stats input rules (src/schemas/reports.ts, W3-01).

import { describe, expect, it } from "vitest";
import { bg } from "@/i18n/bg";
import {
  addDays,
  createReportSchema,
  DISTRICT_CODES,
  MapStatsQuerySchema,
  normalizeBulgarianPhone,
  todayInBulgaria,
} from "@/schemas/reports";

const TODAY = "2026-11-09";
const schema = createReportSchema(TODAY);

// A valid report; each test changes one field. `{ ...VALID, x }` copies the object
// with x replaced, like {**VALID, "x": ...} in Python.
const VALID = {
  districtCode: "BG-02",
  scriptType: "police",
  occurredOn: "2026-11-08",
  website: "",
};

// The Bulgarian message of the first problem (what the person would see).
function firstError(input: unknown): string | undefined {
  const result = schema.safeParse(input);
  return result.success ? undefined : result.error.issues[0]?.message;
}

describe("createReportSchema", () => {
  it("accepts a minimal report and fills in the optional fields as null", () => {
    expect(schema.parse(VALID)).toEqual({ ...VALID, description: null, callerNumber: null });
  });

  it("accepts today and exactly 90 days ago, rejects the future and day 91", () => {
    expect(schema.safeParse({ ...VALID, occurredOn: TODAY }).success).toBe(true);
    expect(schema.safeParse({ ...VALID, occurredOn: "2026-08-11" }).success).toBe(true);
    expect(firstError({ ...VALID, occurredOn: "2026-11-10" })).toBe(bg.reports.dateInFuture);
    expect(firstError({ ...VALID, occurredOn: "2026-08-10" })).toBe(bg.reports.dateTooOld);
  });

  it("rejects dates that are not real days or not in YYYY-MM-DD form", () => {
    for (const occurredOn of ["2026-02-30", "08.11.2026", "", "2026-11-8", undefined]) {
      expect(firstError({ ...VALID, occurredOn })).toBe(bg.reports.dateInvalid);
    }
  });

  it("accepts all 28 districts and nothing else", () => {
    expect(DISTRICT_CODES).toHaveLength(28);
    for (const districtCode of DISTRICT_CODES) {
      expect(schema.safeParse({ ...VALID, districtCode }).success).toBe(true);
    }
    for (const districtCode of ["BG-00", "BG-29", "bg-02", "Бургас", 2, undefined]) {
      expect(firstError({ ...VALID, districtCode })).toBe(bg.reports.districtInvalid);
    }
  });

  it("accepts the 5 script types only", () => {
    expect(schema.safeParse({ ...VALID, scriptType: "courier" }).success).toBe(true);
    expect(firstError({ ...VALID, scriptType: "lottery" })).toBe(bg.reports.scriptInvalid);
  });

  it("keeps a description up to 1000 characters, trims it, rejects a longer one", () => {
    expect(schema.parse({ ...VALID, description: "  Обадиха се.  " }).description).toBe(
      "Обадиха се.",
    );
    expect(schema.parse({ ...VALID, description: "а".repeat(1000) }).description).toHaveLength(
      1000,
    );
    expect(firstError({ ...VALID, description: "а".repeat(1001) })).toBe(
      bg.reports.descriptionTooLong,
    );
    expect(schema.parse({ ...VALID, description: "   " }).description).toBeNull();
  });

  it("turns a Bulgarian caller number into E.164 and rejects other numbers", () => {
    expect(schema.parse({ ...VALID, callerNumber: "0888 123 456" }).callerNumber).toBe(
      "+359888123456",
    );
    expect(schema.parse({ ...VALID, callerNumber: "" }).callerNumber).toBeNull();
    expect(schema.parse({ ...VALID, callerNumber: null }).callerNumber).toBeNull();
    for (const callerNumber of ["12345", "+44 20 7946 0958", "обади се"]) {
      expect(firstError({ ...VALID, callerNumber })).toBe(bg.reports.callerNumberInvalid);
    }
  });

  it("accepts any text in the honeypot (the service drops the report, no error)", () => {
    expect(schema.parse({ ...VALID, website: "http://spam.example" }).website).toBe(
      "http://spam.example",
    );
    expect(schema.parse({ ...VALID, website: undefined }).website).toBe("");
  });
});

describe("date helpers", () => {
  it("uses the date in Bulgaria, not in UTC", () => {
    // 23:30 UTC on 8 Nov is already 01:30 on 9 Nov in Sofia (UTC+2 in winter).
    expect(todayInBulgaria(new Date("2026-11-08T23:30:00Z"))).toBe("2026-11-09");
    expect(todayInBulgaria(new Date("2026-11-09T12:00:00Z"))).toBe("2026-11-09");
  });

  it("adds and subtracts days across months and leap years", () => {
    expect(addDays("2026-11-09", -90)).toBe("2026-08-11");
    expect(addDays("2028-02-28", 1)).toBe("2028-02-29");
  });

  it("normalizes only Bulgarian numbers", () => {
    expect(normalizeBulgarianPhone("+359 2 123 4567")).toBe("+35921234567");
    expect(normalizeBulgarianPhone("+44 20 7946 0958")).toBeNull();
  });
});

describe("MapStatsQuerySchema", () => {
  it("defaults to 4 weeks and accepts 1 to 12", () => {
    expect(MapStatsQuerySchema.parse({}).weeks).toBe(4);
    expect(MapStatsQuerySchema.parse({ weeks: "1" }).weeks).toBe(1);
    expect(MapStatsQuerySchema.parse({ weeks: "12" }).weeks).toBe(12);
  });

  it("rejects 0, 13, fractions and text", () => {
    for (const weeks of ["0", "13", "2.5", "abc", ""]) {
      const result = MapStatsQuerySchema.safeParse({ weeks });
      expect(result.success).toBe(false);
      expect(result.error?.issues[0]?.message).toBe(bg.reports.weeksInvalid);
    }
  });
});
