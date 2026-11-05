// Unit tests for the header's logged-in menu: role -> area link, and who sees „Изход“.

import { describe, expect, it } from "vitest";
import { accountLinkFor, showsLogout } from "@/components/layout/accountLinks";
import { ROUTES } from "@/config/routes";
import { bg } from "@/i18n/bg";

describe("accountLinkFor", () => {
  it("sends each role to its own area", () => {
    expect(accountLinkFor("family")).toEqual({
      href: ROUTES.family,
      label: bg.layout.accountFamily,
    });
    expect(accountLinkFor("moderator")).toEqual({
      href: ROUTES.moderator,
      label: bg.layout.accountModerator,
    });
    expect(accountLinkFor("admin")).toEqual({ href: ROUTES.admin, label: bg.layout.accountAdmin });
    expect(accountLinkFor("protected")).toEqual({
      href: ROUTES.protected,
      label: bg.layout.accountProtected,
    });
  });

  it("shows „Моите близки“ to a family member", () => {
    expect(accountLinkFor("family").label).toBe("Моите близки");
  });
});

describe("showsLogout", () => {
  it("shows „Изход“ to people with a password", () => {
    expect(showsLogout("family")).toBe(true);
    expect(showsLogout("moderator")).toBe(true);
    expect(showsLogout("admin")).toBe(true);
  });

  it("never shows „Изход“ on the older person's paired phone", () => {
    expect(showsLogout("protected")).toBe(false);
  });
});
