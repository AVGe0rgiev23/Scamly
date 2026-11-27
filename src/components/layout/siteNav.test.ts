// Unit tests for the site navigation model: the header and dock items per role, the
// check pill, the current-page choice, the protected-flow check and the badge words.

import { describe, expect, it } from "vitest";
import {
  GUEST_LINKS,
  HOW_IT_WORKS_HREF,
  badgeLabel,
  currentHref,
  dockLinksFor,
  isCurrentPath,
  isProtectedFlow,
  navLinksFor,
  showsCheckCta,
} from "@/components/layout/siteNav";
import { ROUTES } from "@/config/routes";
import { bg } from "@/i18n/bg";

const ROLES = [null, "family", "moderator", "admin", "protected"] as const;

describe("navLinksFor", () => {
  it("shows a guest only „Как работи“ and „Вход“ (D35)", () => {
    expect(GUEST_LINKS.map((link) => [link.href, link.label])).toEqual([
      ["/#how", bg.layout.howItWorks],
      [ROUTES.login, bg.layout.login],
    ]);
    expect(navLinksFor(null)).toEqual(GUEST_LINKS);
    expect(HOW_IT_WORKS_HREF).toBe("/#how");
  });

  it("gives the older person's phone „Провери“ and „Помощ“", () => {
    expect(navLinksFor("protected").map((link) => [link.href, link.label])).toEqual([
      [ROUTES.protected, bg.layout.dockCheck],
      ["/protected/pomosht", bg.layout.navHelp],
    ]);
  });

  it("gives a family member „Семейство“, „Сигнали“ with the live badge and „Помощ“", () => {
    const links = navLinksFor("family");
    expect(links.map((link) => [link.href, link.label])).toEqual([
      [ROUTES.family, "Семейство"],
      [ROUTES.familyAlerts, "Сигнали"],
      ["/family/pomosht", bg.layout.navHelp],
    ]);
    expect(links.map((link) => link.badge)).toEqual([undefined, "identity", undefined]);
  });

  it("gives the moderator and the admin their area and „Помощ“", () => {
    expect(navLinksFor("moderator").map((link) => link.href)).toEqual([
      ROUTES.moderator,
      ROUTES.moderatorReports,
      "/moderator/pomosht",
    ]);
    expect(navLinksFor("admin").map((link) => link.href)).toEqual([ROUTES.admin, "/admin/pomosht"]);
  });
});

describe("dockLinksFor", () => {
  it("gives a guest Начало / Как работи / Провери / Вход", () => {
    expect(dockLinksFor(null).map((link) => link.href)).toEqual([
      ROUTES.home,
      "/#how",
      ROUTES.protected,
      ROUTES.login,
    ]);
  });

  it("shows a logged-in person the same items as the header", () => {
    for (const role of ["family", "moderator", "admin", "protected"] as const) {
      expect(dockLinksFor(role)).toEqual(navLinksFor(role));
    }
  });

  it("never shows more than four items, each with an icon and no duplicates", () => {
    for (const role of ROLES) {
      const links = dockLinksFor(role);
      expect(links.length).toBeLessThanOrEqual(4);
      expect(new Set(links.map((link) => link.href)).size).toBe(links.length);
      for (const link of links) {
        expect(link.label.length).toBeGreaterThan(0);
        expect(link.icon.length).toBeGreaterThan(0);
      }
    }
  });
});

describe("showsCheckCta", () => {
  it("shows the bright check pill to a guest only", () => {
    expect(showsCheckCta(null)).toBe(true);
    for (const role of ["protected", "family", "moderator", "admin"] as const) {
      expect(showsCheckCta(role)).toBe(false);
    }
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

  it("never marks a link to a part of a page", () => {
    expect(isCurrentPath("/", HOW_IT_WORKS_HREF)).toBe(false);
  });
});

describe("currentHref", () => {
  it("lights only the most specific link", () => {
    const family = navLinksFor("family");
    expect(currentHref("/family", family)).toBe(ROUTES.family);
    expect(currentHref("/family/alerts", family)).toBe(ROUTES.familyAlerts);
    expect(currentHref("/family/pomosht", family)).toBe("/family/pomosht");
    expect(currentHref("/family/abc-123", family)).toBe(ROUTES.family);
    expect(currentHref("/karta", family)).toBeNull();
    expect(currentHref(null, family)).toBeNull();
  });
});

describe("isProtectedFlow", () => {
  it("is true on the older person's check screen and its preview only", () => {
    expect(isProtectedFlow("/protected")).toBe(true);
    expect(isProtectedFlow("/dev/protected")).toBe(true);
    // The help page shows the dock, so „Провери“ is one tap away.
    expect(isProtectedFlow("/protected/pomosht")).toBe(false);
    expect(isProtectedFlow("/svarzhi")).toBe(false);
    expect(isProtectedFlow("/dev/ui")).toBe(false);
    expect(isProtectedFlow(null)).toBe(false);
  });
});

describe("badgeLabel", () => {
  it("says how many questions wait, in correct Bulgarian", () => {
    expect(badgeLabel(0)).toBe("");
    expect(badgeLabel(1)).toBe("1 въпрос чака отговор");
    expect(badgeLabel(3)).toBe("3 въпроса чакат отговор");
  });
});
