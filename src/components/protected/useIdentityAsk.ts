// The brain of „Провери истинския“ on the older person's phone (P-06): a React hook
// that asks the real family member and waits for the answer.
//
//   start(people, person)  POST /api/identity-checks { claimedUserId, askedUserId } with
//                          both = the tapped person („Ти ли си?“) -> "waiting"
//   every 45 s, no answer  POST with the SAME claimedUserId and the next person in calling
//                          order as askedUserId („Знаеш ли дали наистина е Иван?“; the
//                          server marks the previous question "expired"); nobody left -> "nobody"
//   „Не съм аз“ / „Аз съм“ watchIdentityCheck (Realtime + 5 s / 10 s polling) -> "not_me" / "its_me"
//   retry()                the POST failed (offline, 409, 429): try the same person again
//   reset()                back / „Към началото“: forget everything on this screen
//
// The 45 s countdown runs here, in the browser (WHY_WE_CHOSE: client-side countdown).
// An answer to an OLD question (after we moved on) is ignored: only the id in
// `currentCheckId` counts. The last question stays watched while "nobody" is shown,
// so a late „Не съм аз“ from that person still turns the screen red.
//
// A custom hook is a function whose name starts with "use" and that uses React's own
// hooks inside (like a small Python class that keeps state between calls).

import { useEffect, useRef, useState } from "react";
import { callApi } from "@/components/family/api";
import { watchIdentityCheck } from "@/lib/realtime";
import type { IdentityCheckDto, IdentityPersonDto } from "@/schemas/identityChecks";
import { IDENTITY_WAIT_MS, nextPersonToAsk } from "./identityFlow";

// Like a Python Literal[...] of the states of one ask.
export type AskPhase = "sending" | "waiting" | "failed" | "nobody" | "not_me" | "its_me";

// Everything the screens need to know (like a small Python dataclass).
export type IdentityAskState = {
  phase: AskPhase;
  people: IdentityPersonDto[]; // the family list, in calling order
  claimed: IdentityPersonDto; // the tile she tapped: who the caller says they are
  current: IdentityPersonDto; // who is asked now
  asked: string[]; // userIds asked so far
  missed: string[]; // names that did not answer in 45 s, in order
  checkId: string | null; // the open question's id, once the server has it
  deadline: number | null; // when the 45 s end (milliseconds, like Date.now())
  error: string | null; // Bulgarian message of a failed POST
  answer: IdentityCheckDto | null; // the answered question (not_me / its_me)
  dismissed: boolean; // „Аз съм“ was seen and the person went back to the check
};

// How often the countdown ring is redrawn (ms).
const TICK_MS = 250;

export function useIdentityAsk() {
  const [state, setState] = useState<IdentityAskState | null>(null);
  const [now, setNow] = useState(0);
  // Counts the asks on this screen: an old POST answer must not change the screen.
  const run = useRef(0);
  // The only question whose answer counts (a late answer to an older one is ignored).
  const currentCheckId = useRef<string | null>(null);

  async function send(base: IdentityAskState, person: IdentityPersonDto) {
    if (person.userId === null) {
      return;
    }
    run.current += 1;
    const thisRun = run.current;
    currentCheckId.current = null;
    const userId = person.userId;
    // Who the caller pretends to be stays the same for the whole chain.
    const claimedUserId = base.claimed.userId ?? userId;
    const next: IdentityAskState = {
      ...base,
      phase: "sending",
      current: person,
      asked: base.asked.includes(userId) ? base.asked : [...base.asked, userId],
      checkId: null,
      deadline: null,
      error: null,
    };
    setState(next);
    const result = await callApi<{ identityCheck: IdentityCheckDto }>(
      "/api/identity-checks",
      "POST",
      { claimedUserId, askedUserId: userId },
    );
    if (run.current !== thisRun) {
      return; // the person went back or started again meanwhile
    }
    if (result.ok) {
      const startedAt = Date.now();
      currentCheckId.current = result.data.identityCheck.id;
      setNow(startedAt);
      setState({
        ...next,
        phase: "waiting",
        checkId: result.data.identityCheck.id,
        deadline: startedAt + IDENTITY_WAIT_MS,
      });
    } else {
      setState({ ...next, phase: "failed", error: result.messageBg });
    }
  }

  // 45 s without an answer: ask the next person, or say that nobody is left.
  function moveOn(snapshot: IdentityAskState) {
    const missed = [...snapshot.missed, snapshot.current.displayName];
    const next = nextPersonToAsk(snapshot.people, snapshot.asked);
    if (next === null) {
      setState({ ...snapshot, phase: "nobody", missed });
      return;
    }
    void send({ ...snapshot, missed }, next);
  }

  // The countdown: tick while waiting; at 0, move on (once).
  useEffect(() => {
    if (state === null || state.phase !== "waiting" || state.deadline === null) {
      return;
    }
    const snapshot = state;
    const deadline = state.deadline;
    const timer = setInterval(() => {
      const time = Date.now();
      setNow(time);
      if (time >= deadline) {
        clearInterval(timer);
        moveOn(snapshot);
      }
    }, TICK_MS);
    return () => clearInterval(timer);
    // moveOn only uses its argument and stable setters, so `state` is enough here.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  // Watch the open question live until it is answered.
  const watchedId =
    state !== null && (state.phase === "waiting" || state.phase === "nobody")
      ? state.checkId
      : null;
  useEffect(() => {
    if (watchedId === null) {
      return;
    }
    return watchIdentityCheck(watchedId, (check) => {
      if (check.id !== currentCheckId.current) {
        return; // an answer to an older, expired question: ignored
      }
      if (check.status === "not_me" || check.status === "its_me") {
        const answer = check.status;
        run.current += 1;
        currentCheckId.current = null;
        setState((previous) =>
          previous === null ? previous : { ...previous, phase: answer, answer: check },
        );
      }
    });
  }, [watchedId]);

  return {
    state,
    now,
    start(people: IdentityPersonDto[], person: IdentityPersonDto) {
      void send(
        {
          phase: "sending",
          people,
          claimed: person,
          current: person,
          asked: [],
          missed: [],
          checkId: null,
          deadline: null,
          error: null,
          answer: null,
          dismissed: false,
        },
        person,
      );
    },
    retry() {
      if (state !== null && state.phase === "failed") {
        void send(state, state.current);
      }
    },
    dismiss() {
      setState((previous) => (previous === null ? previous : { ...previous, dismissed: true }));
    },
    reset() {
      run.current += 1;
      currentCheckId.current = null;
      setState(null);
    },
  };
}
