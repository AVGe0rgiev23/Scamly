// Unit tests for the site navigation model: the dock per role, the check pill and
// the current-page and protected-flow checks.

import { describe, expect, it } from "vitest";
import {
  DOCK_SIZE,
  GUEST_LINKS,
  dockLinksFor,
  isCurrentPath,
  isProtectedFlow,
  showsCheckCta,
} from "@/components/layout/siteNav";
import { ROUTES } from "@/config/routes";
import { bg } from "@/i18n/bg";

describe("GUEST_LINKS", () => {
  it("keeps login, registration, pairing and the education cards", () => {
    expect(GUEST_LINKS.map((link) => link.href).sort()).toEqual(
      [ROUTES.education, ROUTES.login, ROUTES.pair, ROUTES.register].sort(),
    );
  });
});

describe("dockLinksFor", () => {
  it("gives a guest home, the public tools and „Вход“", () => {
    expect(dockLinksFor(null).map((link) => link.href)).toEqual([
      ROUTES.home,
      ROUTES.education,
      ROUTES.map,
      ROUTES.report,
      ROUTES.login,
    ]);
  });

  it("puts a family member's area and alerts right after home", () => {
    const links = dockLinksFor("family");
    expect(links.slice(0, 3).map((link) => link.href)).toEqual([
      ROUTES.home,
      ROUTES.family,
      ROUTES.familyAlerts,
    ]);
    expect(links[1]?.label).toBe(bg.layout.accountFamily);
  });

  it("gives the moderator the report queue", () => {
    expect(dockLinksFor("moderator").map((link) => link.href)).toContain(ROUTES.moderatorReports);
  });

  it("uses the short word „Проверка“ for the older person's area", () => {
    const area = dockLinksFor("protected")[1];
    expect(area).toEqual({ href: ROUTES.protected, label: bg.layout.dockProtected, icon: "check" });
  });

  it("never shows more than five links, each with an icon and no duplicates", () => {
    for (const role of [null, "family", "moderator", "admin", "protected"] as const) {
      const links = dockLinksFor(role);
      expect(links).toHaveLength(DOCK_SIZE);
      expect(new Set(links.map((link) => link.href)).size).toBe(links.length);
      for (const link of links) {
        expect(link.label.length).toBeGreaterThan(0);
        expect(link.icon.length).toBeGreaterThan(0);
      }
    }
  });
});

describe("showsCheckCta", () => {
  it("shows the check pill to a guest and the older person's phone only", () => {
    expect(showsCheckCta(null)).toBe(true);
    expect(showsCheckCta("protected")).toBe(true);
    expect(showsCheckCta("family")).toBe(false);
    expect(showsCheckCta("moderator")).toBe(false);
    expect(showsCheckCta("admin")).toBe(false);
  });
});

describe("isCurrentPath", () => {
  it("marks home only on the home page", () => {
    expect(isCurrentPath("/", ROUTES.home)).toBe(true);
    expect(isCurrentPath("/karta", ROUTES.home)).toBe(false);
  });

  it("marks a section on its own pages, not on look-alike paths", () => {
    expect(isCurrentPath("/kak-raboti/politsai", ROUTES.education)).toBe(true);
    expect(isCurrentPath("/karta", ROUTES.map)).toBe(true);
    expect(isCurrentPath("/karta-za-hladilnik", ROUTES.map)).toBe(false);
    expect(isCurrentPath(null, ROUTES.map)).toBe(false);
  });
});

describe("isProtectedFlow", () => {
  it("is true on the older person's screens and their preview only", () => {
    expect(isProtectedFlow("/protected")).toBe(true);
    expect(isProtectedFlow("/protected/pomosht")).toBe(true);
    expect(isProtectedFlow("/dev/protected")).toBe(true);
    expect(isProtectedFlow("/svarzhi")).toBe(false);
    expect(isProtectedFlow("/dev/ui")).toBe(false);
    expect(isProtectedFlow(null)).toBe(false);
  });
});
