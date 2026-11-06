// Unit tests for routes.ts: which pages need a login, and where each role starts.

import { describe, expect, it } from "vitest";
import { homePathForRole, isInside, loginPageFor, safeNextPath, withNext } from "@/config/routes";

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

// The `next` parameter of /vhod and /registratsia (W2-14): only paths on our own site.
describe("safeNextPath", () => {
  it("accepts a path on our site, with its query", () => {
    expect(safeNextPath("/pokana?t=abc_DEF-123")).toBe("/pokana?t=abc_DEF-123");
    expect(safeNextPath("/family/alerts")).toBe("/family/alerts");
    expect(safeNextPath("/")).toBe("/");
  });

  it("refuses other sites (no open redirect)", () => {
    expect(safeNextPath("https://evil.example/")).toBeNull();
    expect(safeNextPath("http:evil.example")).toBeNull();
    expect(safeNextPath("//evil.example/pokana")).toBeNull();
    expect(safeNextPath("/\\evil.example")).toBeNull();
    expect(safeNextPath("\\evil.example")).toBeNull();
    expect(safeNextPath("javascript:alert(1)")).toBeNull();
    expect(safeNextPath("pokana")).toBeNull();
  });

  it("refuses hidden characters that browsers drop (/<tab>/evil → //evil)", () => {
    expect(safeNextPath("/\t/evil.example")).toBeNull();
    expect(safeNextPath("/\n/evil.example")).toBeNull();
    expect(safeNextPath("/pokana\u0000")).toBeNull();
  });

  it("refuses an empty, missing or very long value", () => {
    expect(safeNextPath("")).toBeNull();
    expect(safeNextPath(null)).toBeNull();
    expect(safeNextPath(undefined)).toBeNull();
    expect(safeNextPath("/" + "a".repeat(600))).toBeNull();
  });
});

describe("withNext", () => {
  it("adds the encoded next path, or nothing", () => {
    expect(withNext("/vhod", "/pokana?t=abc")).toBe("/vhod?next=%2Fpokana%3Ft%3Dabc");
    expect(withNext("/vhod", null)).toBe("/vhod");
  });
});
