// Unit tests for the pure helpers of the report form /signal (W3-02).

import { describe, expect, it } from "vitest";
import { bg } from "@/i18n/bg";
import {
  checkReport,
  errorsFromApi,
  firstInvalidField,
  oldestReportDay,
  reportBody,
  SCRIPT_CHOICES,
  type ReportValues,
} from "./reportForm";

const TODAY = "2026-11-09";

const GOOD: ReportValues = {
  districtCode: "BG-02",
  scriptType: "police",
  occurredOn: TODAY,
  description: "Казаха, че синът ми е катастрофирал.",
  callerNumber: "",
  website: "",
};

describe("reportBody", () => {
  it("sends every field as typed, the honeypot included", () => {
    expect(reportBody(GOOD)).toEqual({
      districtCode: "BG-02",
      scriptType: "police",
      occurredOn: TODAY,
      description: "Казаха, че синът ми е катастрофирал.",
      callerNumber: "",
      website: "",
    });
  });
});

describe("checkReport", () => {
  it("accepts a good report", () => {
    expect(checkReport(GOOD, TODAY)).toEqual({});
  });

  it("names every missing required field with its Bulgarian message", () => {
    const errors = checkReport({ ...GOOD, districtCode: "", scriptType: "" }, TODAY);
    expect(errors).toEqual({
      districtCode: bg.reports.districtInvalid,
      scriptType: bg.reports.scriptInvalid,
    });
  });

  it("rejects a date in the future and one older than 90 days", () => {
    expect(checkReport({ ...GOOD, occurredOn: "2026-11-10" }, TODAY).occurredOn).toBe(
      bg.reports.dateInFuture,
    );
    expect(checkReport({ ...GOOD, occurredOn: "2026-08-10" }, TODAY).occurredOn).toBe(
      bg.reports.dateTooOld,
    );
    expect(checkReport({ ...GOOD, occurredOn: oldestReportDay(TODAY) }, TODAY)).toEqual({});
  });

  it("rejects a foreign or broken caller number", () => {
    expect(checkReport({ ...GOOD, callerNumber: "12" }, TODAY).callerNumber).toBe(
      bg.reports.callerNumberInvalid,
    );
    expect(checkReport({ ...GOOD, callerNumber: "0888 123 456" }, TODAY)).toEqual({});
  });
});

describe("errorsFromApi", () => {
  it("gives the API's message to the first field and the usual one to the others", () => {
    expect(errorsFromApi(["occurredOn", "districtCode"], bg.reports.dateInFuture)).toEqual({
      occurredOn: bg.reports.dateInFuture,
      districtCode: bg.reports.districtInvalid,
    });
  });

  it("ignores unknown fields and a missing list", () => {
    expect(errorsFromApi(["website", ""], "x")).toEqual({});
    expect(errorsFromApi(undefined, "x")).toEqual({});
  });
});

describe("firstInvalidField", () => {
  it("follows the order of the form", () => {
    expect(firstInvalidField({ callerNumber: "a", scriptType: "b" })).toBe("scriptType");
    expect(firstInvalidField({})).toBeNull();
  });
});

describe("SCRIPT_CHOICES", () => {
  it("has the five scam types, „Друго“ last", () => {
    expect(SCRIPT_CHOICES.map((choice) => choice.value)).toEqual([
      "police",
      "relative_in_trouble",
      "fake_official",
      "courier",
      "unknown",
    ]);
    expect(SCRIPT_CHOICES[4]?.label).toBe("Друго");
  });
});
