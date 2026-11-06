// Unit tests for the offline card's HTML (src/lib/offlinePage.ts, W2-09).

import { describe, expect, it } from "vitest";
import { bg } from "@/i18n/bg";
import { escapeHtml, offlinePageHtml } from "./offlinePage";

describe("offlinePageHtml", () => {
  const html = offlinePageHtml();

  it("is a Bulgarian page with the title and the three rules", () => {
    expect(html).toContain('<html lang="bg">');
    expect(html).toContain(bg.offline.title);
    expect(bg.home.rules).toHaveLength(3);
    for (const rule of bg.home.rules) {
      expect(html).toContain(`<li>${rule}</li>`);
    }
  });

  it("needs no other file: no scripts, no stylesheet links, no images to download", () => {
    expect(html).not.toContain("<script");
    expect(html).not.toContain("<link");
    expect(html).not.toContain("<img");
    expect(html).not.toContain("/_next/");
  });
});

describe("escapeHtml", () => {
  it("escapes the characters that have a meaning in HTML", () => {
    expect(escapeHtml(`<a href="x">&</a>`)).toBe("&lt;a href=&quot;x&quot;&gt;&amp;&lt;/a&gt;");
  });
});
