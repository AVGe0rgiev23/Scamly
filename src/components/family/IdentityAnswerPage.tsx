// /family/proveri?id=… („Провери истинския“, P-06): the family member's answer screen.
// The push „Някой се представя за теб“ and the list on /family/alerts open it.
//
//   „Ти ли си?“ — „Някой се представя за теб пред Мария и иска пари.“
//   [ Не съм аз — обаждам ти се сега! ]  PATCH { answer: "not_me" } (the red button)
//   [ Аз съм ]                            PATCH { answer: "its_me" }
//
// It loads the question (GET /api/identity-checks/:id) and watches it live
// (watchIdentityCheck), so it changes by itself when the time runs out or the phone
// moved on to the next family member. Under the buttons: how long one can still
// answer (until answerableUntil, 15 minutes). After the answer: what the phone shows
// now. 409 → „Вече е отговорено.“
//
// The protected person's own phone number is NOT stored in Scamly (the family's API
// has none), so after „Не съм аз“ there is no tel: link: the screen says, big, to call
// them now on the number they know. (WHY_WE_CHOSE: call-back only to a saved number.)
"use client";

import { ShieldAlert, UserCheck } from "lucide-react";
import { useEffect, useState, useSyncExternalStore } from "react";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Notice } from "@/components/ui/Notice";
import { SkeletonList } from "@/components/ui/Skeleton";
import { ROUTES } from "@/config/routes";
import { bg } from "@/i18n/bg";
import { watchIdentityCheck } from "@/lib/realtime";
import type { IdentityAnswer, IdentityCheckDto } from "@/schemas/identityChecks";
import { minutesAndSeconds } from "@/components/protected/identityFlow";
import { callApi } from "./api";
import { FamilyHeader } from "./FamilyFrame";
import { fill } from "./format";

// The ?id= of the address, read in the browser only (like AlertsPage's useSearch):
// "" on the server, the real value in the browser, without a mismatch warning.
function noSubscription(): () => void {
  return () => undefined;
}
function useCheckId(): string | null {
  const search = useSyncExternalStore(
    noSubscription,
    () => window.location.search,
    () => "",
  );
  const id = new URLSearchParams(search).get("id"); // like Python's parse_qs
  return id === null || id === "" ? null : id;
}

type LoadState =
  | { kind: "loading" }
  | { kind: "error"; message: string }
  | { kind: "ready"; check: IdentityCheckDto };

export function IdentityAnswerPage() {
  const checkId = useCheckId();
  return (
    <>
      <FamilyHeader eyebrow={bg.identityAnswer.eyebrow} title={bg.identityAnswer.title} />
      {checkId === null ? (
        <Notice status="caution" className="max-w-3xl text-lg">
          {bg.identityAnswer.missing}
        </Notice>
      ) : (
        <IdentityAnswer key={checkId} checkId={checkId} />
      )}
      <div className="mt-8">
        <ButtonLink href={ROUTES.familyAlerts} variant="ghost">
          {bg.identityAnswer.toAlerts}
        </ButtonLink>
      </div>
    </>
  );
}

function IdentityAnswer({ checkId }: { checkId: string }) {
  const [load, setLoad] = useState<LoadState>({ kind: "loading" });
  const [sending, setSending] = useState<IdentityAnswer | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [already, setAlready] = useState(false);
  const [now, setNow] = useState<number | null>(null);

  // Load once (to show the API's Bulgarian message if it fails: 404, offline, …),
  // then watch the question live (Realtime + polling, src/lib/realtime.ts).
  const loaded = load.kind === "ready";
  useEffect(() => {
    let active = true;
    async function first() {
      const result = await callApi<{ identityCheck: IdentityCheckDto }>(
        `/api/identity-checks/${encodeURIComponent(checkId)}`,
      );
      if (!active) return;
      setLoad(
        result.ok
          ? { kind: "ready", check: result.data.identityCheck }
          : { kind: "error", message: result.messageBg },
      );
    }
    void first();
    return () => {
      active = false;
    };
  }, [checkId]);
  useEffect(() => {
    if (!loaded) {
      return;
    }
    return watchIdentityCheck(checkId, (check) => setLoad({ kind: "ready", check }));
  }, [checkId, loaded]);

  // The clock for „Можете да отговорите още …“ (every second).
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  async function answer(value: IdentityAnswer) {
    setSending(value);
    setError(null);
    const result = await callApi<{ identityCheck: IdentityCheckDto }>(
      `/api/identity-checks/${encodeURIComponent(checkId)}`,
      "PATCH",
      { answer: value },
    );
    setSending(null);
    if (result.ok) {
      setLoad({ kind: "ready", check: result.data.identityCheck });
    } else if (result.status === 409) {
      setAlready(true);
    } else {
      setError(result.messageBg);
    }
  }

  if (load.kind === "loading") {
    return (
      <div className="max-w-3xl">
        <p role="status" className="sr-only">
          {bg.identityAnswer.loading}
        </p>
        <SkeletonList rows={2} />
      </div>
    );
  }
  if (load.kind === "error") {
    return (
      <Notice status="caution" role="alert" className="max-w-3xl text-lg">
        {load.message}
      </Notice>
    );
  }

  const check = load.check;
  const person = check.personName ?? bg.identityChecks.someone;
  const msLeft = now === null ? null : Date.parse(check.answerableUntil) - now;
  const open = check.status === "pending" && !already && (msLeft === null || msLeft > 0);

  return (
    <section className="family-identity family-glass glass max-w-3xl" data-status={check.status}>
      {/* A live region: the new state is read aloud when the answer is saved. */}
      <div role="status" className="flex flex-col gap-4">
        {open ? (
          <p className="family-identity-question">{fill(bg.identityAnswer.question, { person })}</p>
        ) : null}
        {already ? <p className="family-identity-state">{bg.identityAnswer.already}</p> : null}
        {!already && check.status === "not_me" ? (
          <>
            <p className="family-identity-state">
              {fill(bg.identityAnswer.answeredNotMe, { person })}
            </p>
            <p className="family-identity-call">{fill(bg.identityAnswer.callNow, { person })}</p>
            <p className="text-lg text-fg-muted">{bg.identityAnswer.familyWarned}</p>
          </>
        ) : null}
        {!already && check.status === "its_me" ? (
          <p className="family-identity-state">
            {fill(bg.identityAnswer.answeredItsMe, { person })}
          </p>
        ) : null}
        {!already && !open && check.status !== "not_me" && check.status !== "its_me" ? (
          <p className="family-identity-state">{bg.identityAnswer.expired}</p>
        ) : null}
      </div>

      {open ? (
        <div className="mt-6 flex flex-col gap-4">
          <Button
            variant="danger"
            size="xl"
            className="family-identity-button"
            loading={sending === "not_me"}
            disabled={sending !== null}
            onClick={() => void answer("not_me")}
          >
            <ShieldAlert className="size-7 shrink-0" aria-hidden="true" />
            {sending === "not_me" ? bg.identityAnswer.sending : bg.identityAnswer.notMe}
          </Button>
          <Button
            variant="secondary"
            size="xl"
            className="family-identity-button"
            loading={sending === "its_me"}
            disabled={sending !== null}
            onClick={() => void answer("its_me")}
          >
            <UserCheck className="size-7 shrink-0" aria-hidden="true" />
            {sending === "its_me" ? bg.identityAnswer.sending : bg.identityAnswer.itsMe}
          </Button>
          {msLeft === null ? null : (
            <p className="tabular text-lg text-fg-muted">
              {fill(bg.identityAnswer.timeLeft, { time: minutesAndSeconds(msLeft / 1000) })}
            </p>
          )}
        </div>
      ) : null}
      {error === null ? null : (
        <Notice status="danger" role="alert" className="mt-4 text-lg">
          {error}
        </Notice>
      )}
    </section>
  );
}
