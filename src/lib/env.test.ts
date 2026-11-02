// Unit tests for the environment variable check in env.ts.

import { describe, expect, it } from "vitest";
import { getServerEnv } from "@/lib/env";

// A complete, valid set of fake values (never real keys in tests).
const validEnv = {
  NEXT_PUBLIC_SUPABASE_URL: "http://127.0.0.1:54321",
  NEXT_PUBLIC_SUPABASE_ANON_KEY: "fake-anon-key",
  SUPABASE_SERVICE_ROLE_KEY: "fake-service-role-key",
  PAIRING_PEPPER: "a".repeat(32),
  HASH_PEPPER: "b".repeat(32),
};

describe("getServerEnv", () => {
  it("accepts a valid set and fills in the e-mail default", () => {
    const env = getServerEnv(validEnv);
    expect(env.NEXT_PUBLIC_SUPABASE_URL).toBe("http://127.0.0.1:54321");
    expect(env.EMAIL_PROVIDER).toBe("noop");
    expect(env.GEMINI_API_KEY).toBeUndefined();
  });

  it("names the missing variables in the error", () => {
    expect(() => getServerEnv({})).toThrow(/SUPABASE_SERVICE_ROLE_KEY/);
  });

  it("treats an empty value as missing", () => {
    expect(() => getServerEnv({ ...validEnv, HASH_PEPPER: "" })).toThrow(/HASH_PEPPER/);
  });

  it("rejects an unknown e-mail provider", () => {
    expect(() => getServerEnv({ ...validEnv, EMAIL_PROVIDER: "gmail" })).toThrow(/EMAIL_PROVIDER/);
  });
});
