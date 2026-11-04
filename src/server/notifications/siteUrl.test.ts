// Unit tests for getSiteUrl(): the base address of links in alert e-mails.

import { describe, expect, it } from "vitest";
import { getServerEnv } from "@/lib/env";
import { getSiteUrl } from "@/server/notifications/siteUrl";

const BASE_ENV = {
  NEXT_PUBLIC_SUPABASE_URL: "http://127.0.0.1:54321",
  NEXT_PUBLIC_SUPABASE_ANON_KEY: "fake-anon-key",
  SUPABASE_SERVICE_ROLE_KEY: "fake-service-role-key",
  PAIRING_PEPPER: "a".repeat(32),
  HASH_PEPPER: "b".repeat(32),
};

describe("getSiteUrl", () => {
  it("uses localhost when nothing is set", () => {
    expect(getSiteUrl(getServerEnv(BASE_ENV))).toBe("http://localhost:3000");
  });

  it("uses Vercel's production host name, with https", () => {
    const env = getServerEnv({ ...BASE_ENV, VERCEL_PROJECT_PRODUCTION_URL: "scamly.vercel.app" });
    expect(getSiteUrl(env)).toBe("https://scamly.vercel.app");
  });

  it("prefers SITE_URL and drops the slash at the end", () => {
    const env = getServerEnv({
      ...BASE_ENV,
      SITE_URL: "https://scamly.example/",
      VERCEL_PROJECT_PRODUCTION_URL: "scamly.vercel.app",
    });
    expect(getSiteUrl(env)).toBe("https://scamly.example");
  });
});
