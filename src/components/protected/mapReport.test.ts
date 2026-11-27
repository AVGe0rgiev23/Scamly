// Tests for the red screen's anonymous map report (P-11): the body the API accepts.
import { describe, expect, it } from "vitest";
import { createReportSchema } from "@/schemas/reports";
import { asDistrictCode, buildMapReport, scriptForIdentityNotMe } from "./mapReport";

describe("buildMapReport", () => {
  it("sends only the district, the script and today's Bulgarian date", () => {
    // 23:30 UTC on 26 Nov is already 27 Nov in Sofia.
    const body = buildMapReport({
      districtCode: "BG-02",
      scriptType: scriptForIdentityNotMe(),
      now: new Date("2026-11-26T23:30:00Z"),
    });
    expect(body).toEqual({
      districtCode: "BG-02",
      scriptType: "relative_in_trouble",
      occurredOn: "2026-11-27",
      description: null,
      callerNumber: null,
      website: "",
    });
  });

  it("is accepted by the API's own schema, with nothing personal stored", () => {
    const body = buildMapReport({
      districtCode: "BG-22",
      scriptType: "police",
      now: new Date("2026-11-27T10:00:00Z"),
    });
    const parsed = createReportSchema("2026-11-27").parse(body);
    expect(parsed.description).toBeNull();
    expect(parsed.callerNumber).toBeNull();
    expect(parsed.website).toBe("");
  });
});

describe("asDistrictCode", () => {
  it("accepts only the 28 district codes", () => {
    expect(asDistrictCode("BG-16")).toBe("BG-16");
    for (const value of ["", "BG-29", "Пловдив", null, undefined]) {
      expect(asDistrictCode(value)).toBeNull();
    }
  });
});
