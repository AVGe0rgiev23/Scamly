// Unit tests for the same-origin (CSRF) check in origin.ts.

import { describe, expect, it } from "vitest";
import { ApiError } from "@/server/http/errors";
import { assertSameOrigin, assertSameOriginRead, isSameOrigin } from "@/server/security/origin";

// A fake request to our API on host scamly.example.
function request(method: string, headers: Record<string, string>): Request {
  return new Request("https://scamly.example/api/pairing/redeem", {
    method,
    headers: { host: "scamly.example", ...headers },
  });
}

describe("isSameOrigin", () => {
  it("never blocks GET requests (they change nothing)", () => {
    expect(isSameOrigin(request("GET", { "sec-fetch-site": "cross-site" }))).toBe(true);
  });

  it("allows a POST from our own page", () => {
    expect(isSameOrigin(request("POST", { "sec-fetch-site": "same-origin" }))).toBe(true);
    expect(isSameOrigin(request("POST", { origin: "https://scamly.example" }))).toBe(true);
  });

  it("blocks a POST that another site started", () => {
    expect(isSameOrigin(request("POST", { "sec-fetch-site": "cross-site" }))).toBe(false);
    expect(isSameOrigin(request("POST", { "sec-fetch-site": "same-site" }))).toBe(false);
    expect(isSameOrigin(request("DELETE", { origin: "https://evil.example" }))).toBe(false);
  });

  it("trusts Sec-Fetch-Site over Origin, because the browser sets it", () => {
    const headers = { "sec-fetch-site": "cross-site", origin: "https://scamly.example" };
    expect(isSameOrigin(request("POST", headers))).toBe(false);
  });

  it('blocks "Origin: null" (sandboxed pages, some redirects)', () => {
    expect(isSameOrigin(request("POST", { origin: "null" }))).toBe(false);
  });

  it("allows requests without browser headers (curl, server scripts: no cookies to abuse)", () => {
    expect(isSameOrigin(request("POST", {}))).toBe(true);
  });
});

describe("assertSameOrigin", () => {
  it("throws 403 bad_origin for another site", () => {
    expect(() => assertSameOrigin(request("POST", { origin: "https://evil.example" }))).toThrow(
      ApiError,
    );
    try {
      assertSameOrigin(request("POST", { origin: "https://evil.example" }));
    } catch (error) {
      expect(error).toMatchObject({ status: 403, code: "bad_origin" });
    }
  });
});

describe("assertSameOriginRead (GET routes that hand out a secret)", () => {
  it("allows a GET from our own page and a GET without browser headers", () => {
    expect(() =>
      assertSameOriginRead(request("GET", { "sec-fetch-site": "same-origin" })),
    ).not.toThrow();
    expect(() => assertSameOriginRead(request("GET", {}))).not.toThrow();
  });

  it("blocks a GET that another site started, although GET is otherwise never checked", () => {
    const crossSite = request("GET", { "sec-fetch-site": "cross-site" });
    expect(isSameOrigin(crossSite)).toBe(true);
    expect(() => assertSameOriginRead(crossSite)).toThrow(ApiError);
    expect(() => assertSameOriginRead(request("GET", { origin: "https://evil.example" }))).toThrow(
      ApiError,
    );
  });
});
