// Small helpers that turn API values into Bulgarian text for the family pages.
// Pure functions (no React, no browser), so they are unit-tested in format.test.ts.

import { bg } from "@/i18n/bg";

// "BG-16" -> „Пловдив“. `in` checks that the key exists, like Python's `key in dict`.
export function districtName(code: string): string {
  if (code in bg.districts) {
    return bg.districts[code as keyof typeof bg.districts];
  }
  return bg.family.unknownDistrict;
}

// The 28 districts as a list for a <select>, in the order BG-01 … BG-28.
export function districtOptions(): { code: string; name: string }[] {
  return Object.entries(bg.districts).map(([code, name]) => ({ code, name }));
}
