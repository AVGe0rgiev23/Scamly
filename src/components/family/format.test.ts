// Unit tests for the family pages' text helpers (format.ts).

import { describe, expect, it } from "vitest";
import { bg } from "@/i18n/bg";
import { districtName, districtOptions, fill, formatDateTime } from "./format";

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

describe("fill", () => {
  it("puts the values into the placeholders", () => {
    expect(fill("{name} е на място {n}.", { name: "Иван", n: 2 })).toBe("Иван е на място 2.");
  });
});

describe("formatDateTime", () => {
  it("shows Bulgarian time in winter (UTC+2) and in summer (UTC+3)", () => {
    expect(formatDateTime("2026-11-05T12:30:00Z")).toBe("5 ноември 2026 г., 14:30 ч.");
    expect(formatDateTime("2026-07-05T21:05:00Z")).toBe("6 юли 2026 г., 00:05 ч.");
  });
});
