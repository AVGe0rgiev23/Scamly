// Checks that the 28 district names in bg.ts are exactly the ones the database
// seeds (migration 20261102000001_schema.sql). The family pages show the names from
// bg.ts, the database stores only the code, so the two lists must never drift apart.

import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { bg } from "@/i18n/bg";

const MIGRATION = path.resolve(
  import.meta.dirname,
  "../../supabase/migrations/20261102000001_schema.sql",
);

// Every "('BG-01', 'Благоевград')" pair in the migration, as a code → name object.
// matchAll is like Python's re.finditer.
function districtsInMigration(): Record<string, string> {
  const sql = readFileSync(MIGRATION, "utf8");
  const result: Record<string, string> = {};
  for (const match of sql.matchAll(/\('(BG-\d{2})', '([^']+)'\)/g)) {
    result[match[1] ?? ""] = match[2] ?? "";
  }
  return result;
}

describe("district names", () => {
  it("are the same 28 districts as in the database migration", () => {
    const fromDatabase = districtsInMigration();
    expect(Object.keys(fromDatabase)).toHaveLength(28);
    expect({ ...bg.districts }).toEqual(fromDatabase);
  });

  it("use the codes BG-01 … BG-28 in order", () => {
    const codes = Object.keys(bg.districts);
    const expected = Array.from({ length: 28 }, (_, i) => `BG-${String(i + 1).padStart(2, "0")}`);
    expect(codes).toEqual(expected);
  });
});
