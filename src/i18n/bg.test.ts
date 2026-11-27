// Unit tests for the Bulgarian text file bg.ts.

import { describe, expect, it } from "vitest";
import { APP_NAME } from "@/config/app";
import { bg } from "@/i18n/bg";

describe("bg strings", () => {
  it("uses the app name from the one APP_NAME constant", () => {
    expect(bg.app.name).toBe(APP_NAME);
    expect(bg.app.metaTitle).toContain(APP_NAME);
  });

  it("uses the hook of D34 as the main heading", () => {
    expect(bg.app.tagline).toBe("Гласът може да е фалшив. Близкият ти — не.");
  });

  it("never calls a green check safe (D9)", () => {
    const texts = [bg.verdictBadge.green, bg.verdict.green.title, bg.verdict.green.description];
    for (const text of texts) {
      expect(text.toLowerCase()).not.toContain("безопас");
    }
  });
});
