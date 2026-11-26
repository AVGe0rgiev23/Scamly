// Pure helpers of „Провери истинския“ on the older person's phone (P-06): who is
// asked next when somebody does not answer in 45 seconds, and the countdown. No React,
// no network, so the unit tests (identityFlow.test.ts) can check every case.

import type { IdentityPersonDto } from "@/schemas/identityChecks";

// How long the phone waits for one family member before it asks the next one (D35).
// The countdown runs on the phone (client-side); the server only keeps one open
// question per phone and expires the previous one when the next is sent.
export const IDENTITY_WAIT_MS = 45_000;

// The people who can get the question: they have an account (canReceive) and a
// userId. The API already sends them in calling order (priority 1 first).
export function askablePeople(people: IdentityPersonDto[]): IdentityPersonDto[] {
  return people.filter((person) => person.canReceive && person.userId !== null);
}

// The next person to ask after `asked` (the userIds already asked, in any order):
// the first askable person in calling order who was not asked yet, or null when
// nobody is left. Like Python's next((p for p in people if …), None).
export function nextPersonToAsk(
  people: IdentityPersonDto[],
  asked: string[],
): IdentityPersonDto | null {
  const sorted = [...askablePeople(people)].sort((a, b) => a.priority - b.priority);
  return sorted.find((person) => person.userId !== null && !asked.includes(person.userId)) ?? null;
}

// Whole seconds left until `deadlineMs` (rounded up, never below 0), for the ring.
export function secondsLeft(deadlineMs: number, nowMs: number): number {
  return Math.max(0, Math.ceil((deadlineMs - nowMs) / 1000));
}

// Minutes and seconds as „14:05“ (the family member's time to answer).
export function minutesAndSeconds(totalSeconds: number): string {
  const safe = Math.max(0, Math.floor(totalSeconds));
  const minutes = Math.floor(safe / 60);
  const seconds = safe % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}
