// Unit tests for the engine types file: the constants have the planned values,
// and the value lists are exactly the database enums (so a typo can't sneak in).
// This test file may use Node (to read the SQL file); types.ts itself may not.

import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  CLAIMED_IDENTITIES,
  ENGINE_VERSION,
  HANDOVER_METHODS,
  HARD_RULE_IDS,
  MAX_TEXT_LENGTH,
  PHRASE_WINDOW,
  RISK_LEVELS,
  RISK_THRESHOLDS,
  SCRIPT_TYPES,
  SIGNAL_CATEGORIES,
  TRI_ANSWERS,
} from "@/engine/types";

const schemaSql = readFileSync(
  path.resolve(import.meta.dirname, "../../supabase/migrations/20261102000001_schema.sql"),
  "utf8",
);

// Reads the values of `create type public.<name> as enum ('a', 'b', ...)` from the SQL.
function enumValuesFromSql(name: string): string[] {
  const match = schemaSql.match(new RegExp(`create type public\\.${name} as enum \\(([^)]*)\\)`));
  if (!match || match[1] === undefined) {
    throw new Error(`enum ${name} not found in the schema`);
  }
  return match[1].split(",").map((value) => value.trim().replace(/'/g, ""));
}

describe("engine constants", () => {
  it("have the values from BUILD_PLAN 4.4 and 4.7", () => {
    expect(ENGINE_VERSION).toBe("1.0.0");
    expect(RISK_THRESHOLDS).toEqual({ red: 60, yellow: 30 });
    expect(PHRASE_WINDOW).toBe(6);
    expect(MAX_TEXT_LENGTH).toBe(2000);
    // Same limit as the CHECK on checks.text_redacted in the database.
    expect(schemaSql).toContain(`char_length(text_redacted) <= ${MAX_TEXT_LENGTH}`);
  });
});

describe("value lists", () => {
  it("match the database enums exactly (same values, same order)", () => {
    expect([...CLAIMED_IDENTITIES]).toEqual(enumValuesFromSql("claimed_identity"));
    expect([...TRI_ANSWERS]).toEqual(enumValuesFromSql("tri"));
    expect([...HANDOVER_METHODS]).toEqual(enumValuesFromSql("handover_method"));
    expect([...RISK_LEVELS]).toEqual(enumValuesFromSql("risk_level"));
    expect([...SCRIPT_TYPES]).toEqual(enumValuesFromSql("script_type"));
  });

  it("have six hard rules, HR1 to HR6 in order", () => {
    expect(HARD_RULE_IDS).toHaveLength(6);
    HARD_RULE_IDS.forEach((id, index) => {
      expect(id.startsWith(`HR${index + 1}_`)).toBe(true);
    });
  });

  it("have unique snake_case signal category ids", () => {
    expect(new Set(SIGNAL_CATEGORIES).size).toBe(SIGNAL_CATEGORIES.length);
    for (const category of SIGNAL_CATEGORIES) {
      expect(category).toMatch(/^[a-z]+(_[a-z]+)*$/);
    }
  });
});
