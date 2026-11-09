// Unit tests for the moderators' extra keywords (moderatorKeywords.ts, W3-05).

import { afterEach, describe, expect, it, vi } from "vitest";
import {
  CATEGORY_OF_SCRIPT,
  createKeywordCache,
  toExtraKeywords,
  type KeywordRow,
} from "@/server/services/moderatorKeywords";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("toExtraKeywords", () => {
  it("maps each script type to its scenario category and skips unknown", () => {
    const rows: KeywordRow[] = [
      { script_type: "police", extra_keywords: ["томбол"] },
      { script_type: "relative_in_trouble", extra_keywords: ["реанимац"] },
      { script_type: "fake_official", extra_keywords: ["осигуровк"] },
      { script_type: "courier", extra_keywords: ["митниц"] },
      { script_type: "unknown", extra_keywords: ["всичко"] },
    ];
    expect(toExtraKeywords(rows)).toEqual([
      { category: "scenario_police", stem: "томбол" },
      { category: "scenario_relative", stem: "реанимац" },
      { category: "scenario_official", stem: "осигуровк" },
      { category: "scenario_courier", stem: "митниц" },
    ]);
    expect(CATEGORY_OF_SCRIPT.unknown).toBeNull();
  });

  it("drops invalid stems and repeats", () => {
    const rows: KeywordRow[] = [
      { script_type: "police", extra_keywords: ["томбол", "ab", "latin", " Томбол "] },
      { script_type: "police", extra_keywords: ["томбол"] },
    ];
    expect(toExtraKeywords(rows)).toEqual([{ category: "scenario_police", stem: "томбол" }]);
  });
});

describe("createKeywordCache", () => {
  it("asks the database at most once per minute", async () => {
    let clock = 0;
    let calls = 0;
    const cached = createKeywordCache(
      async () => {
        calls += 1;
        return [{ script_type: "police", extra_keywords: [`дума${"а".repeat(calls)}`] }];
      },
      () => clock,
      60_000,
    );

    expect(await cached()).toEqual([{ category: "scenario_police", stem: "думаа" }]);
    clock = 59_999;
    expect(await cached()).toEqual([{ category: "scenario_police", stem: "думаа" }]);
    expect(calls).toBe(1);
    clock = 60_000;
    expect(await cached()).toEqual([{ category: "scenario_police", stem: "думааа" }]);
    expect(calls).toBe(2);
  });

  it("never throws: keeps the last stems, or none at the start", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    let clock = 0;
    let fail = true;
    const cached = createKeywordCache(
      async () => {
        if (fail) throw new Error("database down");
        return [{ script_type: "courier", extra_keywords: ["митниц"] }];
      },
      () => clock,
      1000,
    );

    expect(await cached()).toEqual([]); // first load fails -> none
    fail = false;
    clock = 1000;
    expect(await cached()).toEqual([{ category: "scenario_courier", stem: "митниц" }]);
    fail = true;
    clock = 2000;
    expect(await cached()).toEqual([{ category: "scenario_courier", stem: "митниц" }]);
  });
});
