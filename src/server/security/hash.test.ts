// Unit tests for hmacSha256 in hash.ts.

import { describe, expect, it } from "vitest";
import { hmacSha256 } from "@/server/security/hash";

describe("hmacSha256", () => {
  it("matches the official test vector (RFC 4231, test case 2)", () => {
    expect(hmacSha256("what do ya want for nothing?", "Jefe")).toBe(
      "5bdcc146bf60754e6a042426089575c75a003f089d2739839dec58b964ec3843",
    );
  });

  it("gives a different hash for a different pepper, so the hash alone is useless", () => {
    expect(hmacSha256("482915", "pepper-one")).not.toBe(hmacSha256("482915", "pepper-two"));
  });

  it("never contains the value itself", () => {
    expect(hmacSha256("482915", "pepper")).not.toContain("482915");
  });
});
