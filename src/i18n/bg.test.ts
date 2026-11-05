// Unit tests for the Bulgarian text file bg.ts.

import { describe, expect, it } from "vitest";
import { APP_NAME } from "@/config/app";
import { bg } from "@/i18n/bg";

describe("bg strings", () => {
  it("uses the app name from the one APP_NAME constant", () => {
    expect(bg.app.name).toBe(APP_NAME);
    expect(bg.app.metaTitle).toContain(APP_NAME);
  });

  it("has the agreed tagline", () => {
    expect(bg.app.tagline).toBe("Обаждат ли ви се за пари? Проверете за 30 секунди.");
  });

  it("never calls a green check safe (D9)", () => {
    const texts = [bg.verdictBadge.green, bg.verdict.green.title, bg.verdict.green.description];
    for (const text of texts) {
      expect(text.toLowerCase()).not.toContain("безопас");
    }
  });
});
