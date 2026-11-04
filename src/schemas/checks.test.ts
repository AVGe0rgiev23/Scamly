// Unit tests for the call-check input rules (src/schemas/checks.ts).

import { describe, expect, it } from "vitest";
import { bg } from "@/i18n/bg";
import { AnswersSchema, ListChecksQuerySchema } from "@/schemas/checks";

// The first error message of a failed check (what the API shows).
function firstMessage(result: { success: boolean; error?: { issues: { message: string }[] } }) {
  return result.error?.issues[0]?.message;
}

describe("AnswersSchema", () => {
  it("accepts a full set of answers", () => {
    const answers = AnswersSchema.parse({
      claimedIdentity: "police",
      asksMoney: "yes",
      handover: "throw",
      rushing: "unsure",
      secrecy: "no",
      text: "  Хвърлете парите от терасата.  ",
    });
    expect(answers).toEqual({
      claimedIdentity: "police",
      asksMoney: "yes",
      handover: "throw",
      rushing: "unsure",
      secrecy: "no",
      text: "Хвърлете парите от терасата.",
    });
  });

  it("treats missing answers as skipped (null) and missing text as empty", () => {
    expect(AnswersSchema.parse({})).toEqual({
      claimedIdentity: null,
      asksMoney: null,
      handover: null,
      rushing: null,
      secrecy: null,
      text: "",
    });
  });

  it("drops fields the phone must not send, such as its own verdict", () => {
    const answers = AnswersSchema.parse({ asksMoney: "no", riskLevel: "green", score: 0 });
    expect(answers).not.toHaveProperty("riskLevel");
    expect(answers).not.toHaveProperty("score");
  });

  it("rejects an unknown answer with the Bulgarian message", () => {
    expect(firstMessage(AnswersSchema.safeParse({ claimedIdentity: "alien" }))).toBe(
      bg.checks.answerInvalid,
    );
    expect(firstMessage(AnswersSchema.safeParse({ rushing: "maybe" }))).toBe(
      bg.checks.answerInvalid,
    );
  });

  it("accepts a handover method only when they ask for money", () => {
    expect(AnswersSchema.safeParse({ asksMoney: "yes", handover: "bank_transfer" }).success).toBe(
      true,
    );
    expect(firstMessage(AnswersSchema.safeParse({ asksMoney: "no", handover: "throw" }))).toBe(
      bg.checks.handoverOnlyWithMoney,
    );
    expect(firstMessage(AnswersSchema.safeParse({ handover: "throw" }))).toBe(
      bg.checks.handoverOnlyWithMoney,
    );
  });

  it("allows at most 2000 characters of text", () => {
    expect(AnswersSchema.safeParse({ text: "а".repeat(2000) }).success).toBe(true);
    expect(firstMessage(AnswersSchema.safeParse({ text: "а".repeat(2001) }))).toBe(
      bg.checks.textTooLong,
    );
  });
});

describe("ListChecksQuerySchema", () => {
  const personId = "a1000000-0000-0000-0000-000000000001";

  it("needs a person id in the uuid format", () => {
    expect(ListChecksQuerySchema.safeParse({ personId }).success).toBe(true);
    expect(ListChecksQuerySchema.safeParse({ personId: "1 or 1=1" }).success).toBe(false);
    expect(ListChecksQuerySchema.safeParse({}).success).toBe(false);
  });

  it("accepts a cursor in the database's timestamp format only", () => {
    const cursor = "2026-11-09T10:00:00.123456+00:00";
    expect(ListChecksQuerySchema.parse({ personId, cursor })).toEqual({ personId, cursor });
    expect(ListChecksQuerySchema.safeParse({ personId, cursor: "yesterday" }).success).toBe(false);
  });
});
