// Unit tests for the input rules in src/schemas: right input passes, wrong input
// fails with the Bulgarian message from bg.ts.

import { describe, expect, it } from "vitest";
import { bg } from "@/i18n/bg";
import { LoginSchema, RegisterSchema } from "@/schemas/auth";
import { RedeemCodeSchema } from "@/schemas/pairing";
import { CreatePersonSchema, IdParamSchema } from "@/schemas/persons";

// The first error message of a failed check (what the API shows).
function firstMessage(result: { success: boolean; error?: { issues: { message: string }[] } }) {
  return result.error?.issues[0]?.message;
}

describe("RegisterSchema", () => {
  const valid = { email: "ivan@example.com", password: "1234567890", displayName: "  Иван  " };

  it("accepts valid input and trims the name", () => {
    const result = RegisterSchema.parse(valid);
    expect(result.displayName).toBe("Иван");
  });

  it("needs a password of at least 10 characters", () => {
    expect(firstMessage(RegisterSchema.safeParse({ ...valid, password: "123456789" }))).toBe(
      bg.auth.passwordTooShort,
    );
  });

  it("rejects a bad e-mail, an empty or too long name", () => {
    expect(firstMessage(RegisterSchema.safeParse({ ...valid, email: "ivan" }))).toBe(
      bg.auth.emailInvalid,
    );
    expect(firstMessage(RegisterSchema.safeParse({ ...valid, displayName: "   " }))).toBe(
      bg.auth.displayNameInvalid,
    );
    expect(firstMessage(RegisterSchema.safeParse({ ...valid, displayName: "я".repeat(61) }))).toBe(
      bg.auth.displayNameInvalid,
    );
  });

  it("answers in Bulgarian even for a body that is not an object or has wrong types", () => {
    expect(firstMessage(RegisterSchema.safeParse(null))).toBe(bg.errors.validation);
    expect(firstMessage(RegisterSchema.safeParse({ ...valid, password: 12345678901 }))).toBe(
      bg.auth.passwordTooShort,
    );
  });
});

describe("LoginSchema", () => {
  it("needs an e-mail and a password", () => {
    expect(LoginSchema.safeParse({ email: "a@b.bg", password: "x" }).success).toBe(true);
    expect(firstMessage(LoginSchema.safeParse({ email: "a@b.bg", password: "" }))).toBe(
      bg.auth.passwordRequired,
    );
  });
});

describe("RedeemCodeSchema", () => {
  it("accepts exactly 6 digits", () => {
    expect(RedeemCodeSchema.safeParse({ code: "012345" }).success).toBe(true);
  });

  it("rejects 5 or 7 digits, letters and spaces", () => {
    for (const code of ["12345", "1234567", "12345a", "123 45", ""]) {
      expect(firstMessage(RedeemCodeSchema.safeParse({ code }))).toBe(bg.pairing.codeFormat);
    }
  });
});

describe("CreatePersonSchema", () => {
  it("accepts the 28 districts BG-01 … BG-28 only", () => {
    expect(
      CreatePersonSchema.safeParse({ displayName: "Баба", districtCode: "BG-01" }).success,
    ).toBe(true);
    expect(
      CreatePersonSchema.safeParse({ displayName: "Баба", districtCode: "BG-28" }).success,
    ).toBe(true);
    for (const districtCode of ["BG-00", "BG-29", "bg-02", "BG-2"]) {
      expect(
        firstMessage(CreatePersonSchema.safeParse({ displayName: "Баба", districtCode })),
      ).toBe(bg.persons.districtInvalid);
    }
  });
});

describe("IdParamSchema", () => {
  it("accepts a uuid and rejects anything else", () => {
    expect(IdParamSchema.safeParse("a1000000-0000-4000-8000-000000000001").success).toBe(true);
    expect(IdParamSchema.safeParse("1 or 1=1").success).toBe(false);
  });
});
