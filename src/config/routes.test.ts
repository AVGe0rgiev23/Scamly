// Unit tests for routes.ts: which pages need a login, and where each role starts.

import { describe, expect, it } from "vitest";
import { homePathForRole, isInside, loginPageFor } from "@/config/routes";

describe("isInside", () => {
  it("matches the area itself and pages inside it", () => {
    expect(isInside("/family", "/family")).toBe(true);
    expect(isInside("/family/alerts", "/family")).toBe(true);
  });

  it("does not match a different page that only starts with the same letters", () => {
    expect(isInside("/familyx", "/family")).toBe(false);
    expect(isInside("/", "/family")).toBe(false);
  });
});

describe("loginPageFor", () => {
  it("sends logged-out visitors of family, moderator and admin pages to /vhod", () => {
    expect(loginPageFor("/family")).toBe("/vhod");
    expect(loginPageFor("/moderator/reports")).toBe("/vhod");
    expect(loginPageFor("/admin")).toBe("/vhod");
  });

  it("sends a logged-out phone on /protected to the pairing page", () => {
    expect(loginPageFor("/protected")).toBe("/svarzhi");
    expect(loginPageFor("/protected/check")).toBe("/svarzhi");
  });

  it("leaves public pages and the API alone", () => {
    expect(loginPageFor("/")).toBeNull();
    expect(loginPageFor("/vhod")).toBeNull();
    expect(loginPageFor("/svarzhi")).toBeNull();
    expect(loginPageFor("/api/me")).toBeNull();
  });
});

describe("homePathForRole", () => {
  it("opens the right area for every role", () => {
    expect(homePathForRole("family")).toBe("/family");
    expect(homePathForRole("protected")).toBe("/protected");
    expect(homePathForRole("moderator")).toBe("/moderator");
    expect(homePathForRole("admin")).toBe("/admin");
  });
});
