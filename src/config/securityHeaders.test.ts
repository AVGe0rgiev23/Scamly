// Tests for the security headers of every page (W4-01, docs/security.md).

import { describe, expect, it } from "vitest";
import { contentSecurityPolicy, securityHeaders, supabaseOrigins } from "./securityHeaders";

const SUPABASE = "https://abcdefgh.supabase.co";

// The CSP as a dict: directive name → its values, like {"script-src": ["'self'", ...]}.
function directives(policy: string): Record<string, string[]> {
  const result: Record<string, string[]> = {};
  for (const part of policy.split(";")) {
    const [name, ...values] = part.trim().split(/\s+/);
    if (name) result[name] = values;
  }
  return result;
}

describe("supabaseOrigins", () => {
  it("allows the project's https API and its wss Realtime", () => {
    expect(supabaseOrigins(SUPABASE)).toEqual([SUPABASE, "wss://abcdefgh.supabase.co"]);
  });

  it("uses ws for a local http Supabase", () => {
    expect(supabaseOrigins("http://127.0.0.1:54321")).toEqual([
      "http://127.0.0.1:54321",
      "ws://127.0.0.1:54321",
    ]);
  });

  it("allows nothing outside when Supabase is not set or the address is broken", () => {
    expect(supabaseOrigins(undefined)).toEqual([]);
    expect(supabaseOrigins("")).toEqual([]);
    expect(supabaseOrigins("not a url")).toEqual([]);
  });
});

describe("contentSecurityPolicy in production", () => {
  const policy = directives(contentSecurityPolicy({ supabaseUrl: SUPABASE, development: false }));

  it("loads everything from our own site by default", () => {
    expect(policy["default-src"]).toEqual(["'self'"]);
  });

  it("runs scripts only from our site, never eval() or another site", () => {
    expect(policy["script-src"]).toContain("'self'");
    expect(policy["script-src"]).not.toContain("'unsafe-eval'");
    expect(policy["script-src"]?.some((value) => value.startsWith("http"))).toBe(false);
  });

  it("connects only to our site and our Supabase project", () => {
    expect(policy["connect-src"]).toEqual(["'self'", SUPABASE, "wss://abcdefgh.supabase.co"]);
  });

  it("blocks plugins, foreign frames, base-tag tricks and foreign form targets", () => {
    expect(policy["object-src"]).toEqual(["'none'"]);
    expect(policy["frame-ancestors"]).toEqual(["'none'"]);
    expect(policy["base-uri"]).toEqual(["'self'"]);
    expect(policy["form-action"]).toEqual(["'self'"]);
  });

  it("upgrades any http request to https", () => {
    expect(policy["upgrade-insecure-requests"]).toEqual([]);
  });
});

describe("contentSecurityPolicy in development", () => {
  it("adds eval() for next dev only and does not force https on localhost", () => {
    const policy = directives(contentSecurityPolicy({ supabaseUrl: undefined, development: true }));
    expect(policy["script-src"]).toContain("'unsafe-eval'");
    expect(policy["upgrade-insecure-requests"]).toBeUndefined();
    expect(policy["connect-src"]).toEqual(["'self'"]);
  });
});

describe("securityHeaders", () => {
  const headers = securityHeaders({ supabaseUrl: SUPABASE, development: false });
  const byName = Object.fromEntries(headers.map((header) => [header.key, header.value]));

  it("sends every header securityheaders.com checks", () => {
    for (const name of [
      "Content-Security-Policy",
      "Strict-Transport-Security",
      "X-Content-Type-Options",
      "X-Frame-Options",
      "Referrer-Policy",
      "Permissions-Policy",
    ]) {
      expect(byName[name], name).toBeTruthy();
    }
  });

  it("keeps HTTPS for two years and never lets the page be framed", () => {
    expect(byName["Strict-Transport-Security"]).toContain("max-age=63072000");
    expect(byName["X-Frame-Options"]).toBe("DENY");
    expect(byName["X-Content-Type-Options"]).toBe("nosniff");
  });

  it("allows the microphone (voice input) only for our own pages and nothing else", () => {
    expect(byName["Permissions-Policy"]).toContain("microphone=(self)");
    expect(byName["Permissions-Policy"]).toContain("camera=()");
    expect(byName["Permissions-Policy"]).toContain("geolocation=()");
  });
});
