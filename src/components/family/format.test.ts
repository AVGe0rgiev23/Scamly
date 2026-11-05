// Unit tests for the family pages' text helpers (format.ts).

import { describe, expect, it } from "vitest";
import { bg } from "@/i18n/bg";
import { districtName, districtOptions } from "./format";

describe("districtName", () => {
  it("gives the Bulgarian name of a district code", () => {
    expect(districtName("BG-16")).toBe("Пловдив");
    expect(districtName("BG-22")).toBe("София (столица)");
  });

  it("does not break on an unknown code", () => {
    expect(districtName("BG-99")).toBe(bg.family.unknownDistrict);
  });
});

describe("districtOptions", () => {
  it("lists all 28 districts, BG-01 first", () => {
    const options = districtOptions();
    expect(options).toHaveLength(28);
    expect(options[0]).toEqual({ code: "BG-01", name: "Благоевград" });
    expect(options[27]).toEqual({ code: "BG-28", name: "Ямбол" });
  });
});
