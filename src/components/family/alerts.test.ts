// Unit tests for the helpers of the family's alert page (src/components/family/alerts.ts).

import { describe, expect, it } from "vitest";
import { bg } from "@/i18n/bg";
import type { CheckDto } from "@/schemas/checks";
import {
  announcementFor,
  findNewCheckIds,
  focusCheckId,
  personNameOf,
  responderMessage,
  statusText,
} from "./alerts";

const PERSON = "a1000000-0000-4000-8000-000000000001";
const CHECK_ID = "e1000000-0000-4000-8000-000000000001";

function check(id: string, status: "started" | "answered" = "started"): CheckDto {
  return {
    id,
    protectedPersonId: PERSON,
    status,
    startedAt: "2026-11-05T09:30:00Z",
    answeredAt: null,
    answers: {
      claimedIdentity: null,
      asksMoney: null,
      handover: null,
      rushing: null,
      secrecy: null,
      textRedacted: null,
    },
    verdict: null,
    acknowledgement: null,
  };
}

describe("focusCheckId", () => {
  it("reads a check id from ?check=", () => {
    expect(focusCheckId(`?check=${CHECK_ID}`)).toBe(CHECK_ID);
    expect(focusCheckId(`?check=${CHECK_ID.toUpperCase()}`)).toBe(CHECK_ID);
  });

  it("ignores a missing or malformed id", () => {
    expect(focusCheckId("")).toBeNull();
    expect(focusCheckId("?check=")).toBeNull();
    expect(focusCheckId("?check=../../api")).toBeNull();
  });
});

describe("findNewCheckIds", () => {
  it("counts nothing as new on the first load", () => {
    expect(findNewCheckIds(null, [check("a"), check("b")])).toEqual([]);
  });

  it("finds the checks that were not shown before", () => {
    expect(findNewCheckIds(new Set(["a"]), [check("b"), check("a")])).toEqual(["b"]);
    expect(findNewCheckIds(new Set(["a", "b"]), [check("b"), check("a")])).toEqual([]);
  });
});

describe("texts", () => {
  const names = new Map([[PERSON, "Баба Елена"]]);

  it("names the person, or „Ваш близък“ when unknown", () => {
    expect(personNameOf(names, check("a"))).toBe("Баба Елена");
    expect(personNameOf(new Map(), check("a"))).toBe(bg.alerts.someone);
  });

  it("says whether the check is still running", () => {
    expect(statusText(check("a"))).toBe(bg.alerts.statusStarted);
    expect(statusText(check("a", "answered"))).toBe(bg.alerts.statusAnswered);
  });

  it("announces each new alert with the person's name", () => {
    expect(announcementFor([check("a")], names)).toBe(
      "Нов сигнал: Баба Елена проверява съмнително обаждане.",
    );
  });
});

describe("responderMessage", () => {
  const acknowledgement = { at: "2026-11-05T09:31:00Z", displayName: "Иван", messageBg: "" };

  it("tells the first family member that they took the call", () => {
    expect(responderMessage({ checkId: "a", first: true, acknowledgement })).toBe(
      "Вие поехте обаждането.",
    );
  });

  it("tells a later family member who is already calling", () => {
    expect(responderMessage({ checkId: "a", first: false, acknowledgement })).toBe(
      "Иван вече се обажда.",
    );
    expect(
      responderMessage({
        checkId: "a",
        first: false,
        acknowledgement: { ...acknowledgement, displayName: null },
      }),
    ).toBe(bg.alerts.someoneResponding);
  });
});
