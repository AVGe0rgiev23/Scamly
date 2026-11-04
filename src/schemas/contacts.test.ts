// Unit tests for the W2-08 input rules: phone numbers, the contact list, invites and
// the person update (src/schemas/contacts.ts, invites.ts, persons.ts).

import { describe, expect, it } from "vitest";
import { bg } from "@/i18n/bg";
import { ContactsSchema, normalizePhone } from "@/schemas/contacts";
import { CreateInviteSchema, RedeemInviteSchema } from "@/schemas/invites";
import { UpdatePersonSchema } from "@/schemas/persons";

// The first error message of a failed check (what the API shows).
function firstMessage(result: { success: boolean; error?: { issues: { message: string }[] } }) {
  return result.error?.issues[0]?.message;
}

describe("normalizePhone", () => {
  it("turns the usual Bulgarian spellings into one E.164 number", () => {
    for (const typed of [
      "0888 123 456",
      "0888-123-456",
      "+359 888 123 456",
      "00359888123456",
      "+359 (88) 812-3456",
    ]) {
      expect(normalizePhone(typed)).toBe("+359888123456");
    }
    expect(normalizePhone("02 123 4567")).toBe("+35921234567"); // Sofia landline
  });

  it("accepts relatives abroad (any E.164 number)", () => {
    expect(normalizePhone("+44 20 7946 0958")).toBe("+442079460958");
    expect(normalizePhone("0049 151 23456789")).toBe("+4915123456789");
  });

  it("refuses things that are not phone numbers", () => {
    for (const typed of [
      "",
      "123",
      "abc",
      "0888 12",
      "+359 0888 123 456",
      "+359888123456789",
      "08881234567890",
      "+0123456789",
    ]) {
      expect(normalizePhone(typed)).toBeNull();
    }
  });
});

describe("ContactsSchema", () => {
  const anna = { id: "c0000000-0000-4000-8000-000000000001", displayName: "Анна", priority: 1 };

  it("accepts 1 to 5 contacts and stores phones as E.164; empty phone = none", () => {
    const result = ContactsSchema.parse([
      { ...anna, phone: "" },
      { displayName: " Иван ", phone: "0888 123 456", priority: 2 },
    ]);
    expect(result).toEqual([
      { ...anna, phone: null },
      { displayName: "Иван", phone: "+359888123456", priority: 2 },
    ]);
  });

  it("drops fields the browser must not set, such as an account id", () => {
    const [first] = ContactsSchema.parse([{ ...anna, userId: "x", user_id: "y" }]);
    expect(Object.keys(first ?? {}).sort()).toEqual(["displayName", "id", "phone", "priority"]);
  });

  it("refuses an empty list and more than 5 contacts", () => {
    expect(firstMessage(ContactsSchema.safeParse([]))).toBe(bg.contacts.listInvalid);
    const six = [1, 2, 3, 4, 5, 6].map((priority) => ({
      displayName: "Х",
      phone: "0888123456",
      priority,
    }));
    expect(ContactsSchema.safeParse(six).success).toBe(false);
    expect(firstMessage(ContactsSchema.safeParse({ contacts: [anna] }))).toBe(
      bg.contacts.listInvalid,
    );
  });

  it("needs places 1–5, whole numbers", () => {
    for (const priority of [0, 6, 1.5, "1"]) {
      expect(firstMessage(ContactsSchema.safeParse([{ ...anna, priority }]))).toBe(
        bg.contacts.priorityInvalid,
      );
    }
  });

  it("refuses a bad phone and a bad name", () => {
    expect(firstMessage(ContactsSchema.safeParse([{ ...anna, phone: "123" }]))).toBe(
      bg.contacts.phoneInvalid,
    );
    expect(firstMessage(ContactsSchema.safeParse([{ ...anna, displayName: "  " }]))).toBe(
      bg.contacts.displayNameInvalid,
    );
  });
});

describe("CreateInviteSchema and RedeemInviteSchema", () => {
  it("needs a name and a place 1–5", () => {
    expect(CreateInviteSchema.parse({ displayName: " Иван ", priority: 3 })).toEqual({
      displayName: "Иван",
      priority: 3,
    });
    expect(firstMessage(CreateInviteSchema.safeParse({ displayName: "Иван", priority: 9 }))).toBe(
      bg.invites.priorityInvalid,
    );
  });

  it("accepts only a token in our format, with the generic invite message otherwise", () => {
    expect(RedeemInviteSchema.safeParse({ token: "a".repeat(43) }).success).toBe(true);
    for (const token of ["a".repeat(42), "a".repeat(44), "a+".repeat(21) + "a", 42]) {
      expect(firstMessage(RedeemInviteSchema.safeParse({ token }))).toBe(bg.invites.invalidInvite);
    }
  });
});

describe("UpdatePersonSchema", () => {
  it("accepts one or both fields, refuses an empty change and a bad district", () => {
    expect(UpdatePersonSchema.parse({ districtCode: "BG-22" })).toEqual({ districtCode: "BG-22" });
    expect(firstMessage(UpdatePersonSchema.safeParse({}))).toBe(bg.persons.nothingToChange);
    expect(firstMessage(UpdatePersonSchema.safeParse({ districtCode: "BG-29" }))).toBe(
      bg.persons.districtInvalid,
    );
  });
});
