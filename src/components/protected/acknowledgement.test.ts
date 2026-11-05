// Unit tests for the family message on the phone (acknowledgement.ts).

import { describe, expect, it } from "vitest";
import { familyMessage } from "./acknowledgement";

describe("familyMessage", () => {
  it("is empty until somebody answers", () => {
    expect(familyMessage(null)).toBeNull();
  });

  it("names the family member who is calling", () => {
    expect(familyMessage({ at: "2026-11-05T10:00:00Z", displayName: "Иван", messageBg: "" })).toBe(
      "Иван ще ви се обади веднага.",
    );
  });

  it("says „Ваш близък“ when the name is not known", () => {
    expect(familyMessage({ at: "2026-11-05T10:00:00Z", displayName: null, messageBg: "" })).toBe(
      "Ваш близък ще ви се обади веднага.",
    );
  });
});
