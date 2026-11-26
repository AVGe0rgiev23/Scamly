// The waiting header of „Провери истинския“ (P-06): it sits ABOVE the questions of the
// check while the real family member is asked, so the person answers the check in
// the meantime. A calm halo ring counts the 45 seconds down (an SVG circle whose
// stroke shrinks, protected.css .check-ask-ring); with reduced motion it jumps.
//
//   sending   „Изпращаме въпроса на Иван…“
//   waiting   „Питаме Иван…“ (+ „Иван не отговори.“ and the reminder once we moved on)
//   failed    the API's Bulgarian message and „Опитайте отново“
//   nobody    „Никой не отговори. Довършете проверката…“ and the reminder
//
// The words live in a live region (role="status"), so a screen reader says the
// change („Питаме Мария…“) without moving the focus away from the question.

import { fill } from "@/components/family/format";
import { Button } from "@/components/ui/Button";
import { bg } from "@/i18n/bg";
import { IDENTITY_WAIT_MS, secondsLeft } from "./identityFlow";
import type { IdentityAskState } from "./useIdentityAsk";

const TOTAL_SECONDS = IDENTITY_WAIT_MS / 1000;
// The ring's length: 2πr for r = 44 (the SVG below).
const RING_LENGTH = 2 * Math.PI * 44;

export function IdentityWaiting({
  state,
  now,
  onRetry,
}: {
  state: IdentityAskState;
  now: number;
  onRetry: () => void;
}) {
  const name = state.current.displayName;
  const left =
    state.phase === "waiting" && state.deadline !== null
      ? secondsLeft(state.deadline, now)
      : state.phase === "sending"
        ? TOTAL_SECONDS
        : 0;
  const share = left / TOTAL_SECONDS;
  const lastMissed = state.missed[state.missed.length - 1];

  let title: string;
  if (state.phase === "sending") {
    title = fill(bg.identityAsk.sending, { name });
  } else if (state.phase === "failed") {
    title = fill(bg.identityAsk.failed, { name });
  } else if (state.phase === "nobody") {
    title = bg.identityAsk.nobody;
  } else {
    title = fill(bg.identityAsk.waiting, { name });
  }

  return (
    <section className="check-ask-wait glass" data-phase={state.phase}>
      <div className="check-ask-ring" aria-hidden="true">
        <svg viewBox="0 0 100 100" focusable="false">
          <circle className="check-ask-ring-track" cx="50" cy="50" r="44" />
          <circle
            className="check-ask-ring-value"
            cx="50"
            cy="50"
            r="44"
            strokeDasharray={RING_LENGTH}
            strokeDashoffset={RING_LENGTH * (1 - share)}
          />
        </svg>
        <span className="check-ask-ring-number tabular">
          {state.phase === "waiting" || state.phase === "sending" ? left : "–"}
        </span>
      </div>
      <div className="flex min-w-0 flex-col gap-1.5">
        <div role="status">
          {lastMissed === undefined || state.phase === "nobody" ? null : (
            <p className="text-lg font-semibold text-fg-muted">
              {fill(bg.identityAsk.noAnswer, { name: lastMissed })}
            </p>
          )}
          <p className="check-ask-wait-title">{title}</p>
          {state.phase === "failed" && state.error !== null ? (
            <p className="mt-1 text-lg text-fg">{state.error}</p>
          ) : null}
        </div>
        {state.phase === "waiting" || state.phase === "sending" ? (
          <p className="text-lg text-fg-muted">
            <span className="sr-only">
              {left} {bg.identityAsk.seconds}.{" "}
            </span>
            {bg.identityAsk.waitingHint}
          </p>
        ) : null}
        {state.missed.length > 0 ? (
          <p className="check-ask-remind">
            {fill(bg.identityAsk.askSomething, { name: state.claimed.displayName })}
          </p>
        ) : null}
        {state.phase === "failed" ? (
          <Button variant="secondary" size="xl" className="mt-2" onClick={onRetry}>
            {bg.identityAsk.retry}
          </Button>
        ) : null}
      </div>
    </section>
  );
}
