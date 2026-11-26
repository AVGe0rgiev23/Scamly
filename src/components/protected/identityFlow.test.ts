// Unit tests for the pure helpers of „Провери истинския“ on the phone (identityFlow.ts).

import { describe, expect, it } from "vitest";
import type { IdentityPersonDto } from "@/schemas/identityChecks";
import {
  IDENTITY_WAIT_MS,
  askablePeople,
  minutesAndSeconds,
  nextPersonToAsk,
  secondsLeft,
} from "./identityFlow";

function person(name: string, priority: number, userId: string | null): IdentityPersonDto {
  return {
    userId,
    displayName: name,
    initials: name.slice(0, 1),
    phone: "+359 888 000 00" + priority,
    priority,
    canReceive: userId !== null,
  };
}

const IVAN = person("Иван", 1, "u-ivan");
const PETAR = person("Петър", 2, null); // no Scamly account
const MARIA = person("Мария", 3, "u-maria");
const PEOPLE = [IVAN, PETAR, MARIA];

describe("askablePeople", () => {
  it("keeps only people with an account", () => {
    expect(askablePeople(PEOPLE)).toEqual([IVAN, MARIA]);
  });
});

describe("nextPersonToAsk", () => {
  it("skips the person without Scamly and the ones already asked", () => {
    expect(nextPersonToAsk(PEOPLE, ["u-ivan"])).toEqual(MARIA);
  });

  it("follows the calling order, not the list order", () => {
    expect(nextPersonToAsk([MARIA, PETAR, IVAN], [])).toEqual(IVAN);
  });

  it("returns null when nobody is left", () => {
    expect(nextPersonToAsk(PEOPLE, ["u-ivan", "u-maria"])).toBeNull();
    expect(nextPersonToAsk([PETAR], [])).toBeNull();
    expect(nextPersonToAsk([], [])).toBeNull();
  });

  it("never asks somebody without a userId, even if canReceive is wrongly true", () => {
    expect(nextPersonToAsk([{ ...PETAR, canReceive: true }], [])).toBeNull();
  });
});

describe("secondsLeft", () => {
  it("counts down 45 whole seconds and stops at 0", () => {
    expect(IDENTITY_WAIT_MS).toBe(45_000);
    expect(secondsLeft(IDENTITY_WAIT_MS, 0)).toBe(45);
    expect(secondsLeft(IDENTITY_WAIT_MS, 100)).toBe(45); // rounded up
    expect(secondsLeft(IDENTITY_WAIT_MS, 44_001)).toBe(1);
    expect(secondsLeft(IDENTITY_WAIT_MS, 45_000)).toBe(0);
    expect(secondsLeft(IDENTITY_WAIT_MS, 60_000)).toBe(0);
  });
});

describe("minutesAndSeconds", () => {
  it("writes minutes and two-digit seconds", () => {
    expect(minutesAndSeconds(900)).toBe("15:00");
    expect(minutesAndSeconds(65)).toBe("1:05");
    expect(minutesAndSeconds(0)).toBe("0:00");
    expect(minutesAndSeconds(-3)).toBe("0:00");
  });
});
