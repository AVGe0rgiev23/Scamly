// The family's live alert page /family/alerts („Сигнали“, task W2-03) with the
// „Обаждам ѝ се сега“ button on each alert (task W2-04).
//
// What it does:
//   1. Loads the people this family member looks after (GET /api/persons).
//   2. Watches all their checks live with watchChecksOfPersons() (src/lib/realtime.ts):
//      Realtime is the doorbell, the data always comes from GET /api/checks?personId=…,
//      and polling every 5 s (10 s while Realtime works) is the safety net.
//   3. A check that was not there before is NEW: it is highlighted, announced to
//      screen readers (aria-live) and, only if the user turned it on, beeps/vibrates.
//   4. ?check=<id> (the link in a push notification or an e-mail) scrolls to that
//      check, focuses it and marks it „Сигналът от известието“.
//   5. „Обаждам ѝ се сега“ sends POST /api/checks/:id/acknowledge. The first family
//      member to press it "takes the call" („Вие поехте обаждането.“); the older
//      person's phone then shows „<Име> ще ви се обади веднага.“ (Roberta's W2-01).
//
// The protected person's phone number is not stored (the API has none), so there is
// no tel: link here; the family member calls the number they know.
"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { Button } from "@/components/ui/Button";
import { VerdictBadge } from "@/components/ui/VerdictBadge";
import { bg } from "@/i18n/bg";
import { newestFirst, watchChecksOfPersons } from "@/lib/realtime";
import type { AcknowledgeResultDto } from "@/schemas/checks";
import { enableAlertSound, playAlertSound } from "./alertSound";
import {
  announcementFor,
  findNewCheckIds,
  focusCheckId,
  personNameOf,
  responderMessage,
  statusText,
} from "./alerts";
import { callApi, type CheckDto, type PersonDto } from "./api";
import { acknowledgementText, identityText } from "./CheckHistory";
import { fill, formatDateTime } from "./format";

type PersonsState =
  | { kind: "loading" }
  | { kind: "error"; message: string }
  | { kind: "ready"; persons: PersonDto[] };

// The address's "?…" part, read in the browser only. useSyncExternalStore gives ""
// while the page is built on the server and the real value in the browser, without a
// mismatch (the address never changes while this page is open, so nothing to subscribe).
function noSubscription(): () => void {
  return () => undefined;
}
function useSearch(): string {
  return useSyncExternalStore(
    noSubscription,
    () => window.location.search,
    () => "",
  );
}

export function AlertsPage() {
  const [state, setState] = useState<PersonsState>({ kind: "loading" });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let active = true;
    async function load() {
      const result = await callApi<{ persons: PersonDto[] }>("/api/persons");
      if (!active) return;
      setState(
        result.ok
          ? { kind: "ready", persons: result.data.persons }
          : { kind: "error", message: result.messageBg },
      );
    }
    void load();
    return () => {
      active = false;
    };
  }, [attempt]);

  return (
    <>
      <header className="family-heading">
        <h1>{bg.alerts.title}</h1>
        <p className="muted">{bg.alerts.intro}</p>
      </header>
      {state.kind === "loading" ? (
        <p role="status" className="muted">
          {bg.alerts.loading}
        </p>
      ) : null}
      {state.kind === "error" ? (
        <div className="family-error">
          <p role="alert" className="form-message form-message-error">
            {state.message}
          </p>
          <Button
            variant="secondary"
            onClick={() => {
              setState({ kind: "loading" });
              setAttempt(attempt + 1);
            }}
          >
            {bg.family.retry}
          </Button>
        </div>
      ) : null}
      {state.kind === "ready" && state.persons.length === 0 ? (
        <p className="muted">{bg.alerts.noPersons}</p>
      ) : null}
      {state.kind === "ready" && state.persons.length > 0 ? (
        <AlertsList persons={state.persons} />
      ) : null}
    </>
  );
}

// The live list itself (only once we know whose checks to watch).
function AlertsList({ persons }: { persons: PersonDto[] }) {
  const [checks, setChecks] = useState<CheckDto[] | null>(null); // null = first load
  const [loadFailed, setLoadFailed] = useState(false);
  const [live, setLive] = useState<boolean | null>(null); // null = still connecting
  const [newIds, setNewIds] = useState<Set<string>>(new Set());
  const [announcement, setAnnouncement] = useState("");
  const [sound, setSound] = useState(false);
  // A ref is a box whose content survives re-renders without causing one (like an
  // attribute on a Python object). The live-watch callback reads the sound setting here.
  const soundRef = useRef(false);

  const focusId = focusCheckId(useSearch());
  const [extraCheck, setExtraCheck] = useState<CheckDto | null>(null);
  const [focusMissing, setFocusMissing] = useState(false);
  const focusDone = useRef(false);

  // id -> name, like a Python dict.
  const names = new Map(persons.map((person) => [person.id, person.displayName]));

  // Watch every person's checks; stop when the page closes.
  useEffect(() => {
    const nameOf = new Map(persons.map((person) => [person.id, person.displayName]));
    let known: Set<string> | null = null;
    return watchChecksOfPersons(
      persons.map((person) => person.id),
      (fresh) => {
        const added = findNewCheckIds(known, fresh);
        known = new Set([...(known ?? []), ...fresh.map((check) => check.id)]);
        setChecks(fresh);
        setLoadFailed(false);
        if (added.length > 0) {
          setNewIds((old) => new Set([...old, ...added]));
          setAnnouncement(
            announcementFor(
              fresh.filter((check) => added.includes(check.id)),
              nameOf,
            ),
          );
          if (soundRef.current) {
            playAlertSound();
          }
        }
      },
      { onError: () => setLoadFailed(true), onLive: setLive },
    );
  }, [persons]);

  // ?check=<id> older than the newest 20 of its person: load that one check too.
  const loaded = checks !== null;
  const inList = checks !== null && checks.some((check) => check.id === focusId);
  useEffect(() => {
    if (focusId === null || !loaded || inList) {
      return;
    }
    let active = true;
    async function load() {
      const result = await callApi<{ check: CheckDto }>(`/api/checks/${focusId}`);
      if (!active) return;
      if (result.ok) {
        setExtraCheck(result.data.check);
      } else {
        setFocusMissing(true);
      }
    }
    void load();
    return () => {
      active = false;
    };
  }, [focusId, loaded, inList]);

  const shown =
    checks === null
      ? null
      : newestFirst(
          extraCheck !== null && !inList && extraCheck.id === focusId
            ? [...checks, extraCheck]
            : checks,
        );

  // Scroll to the ?check= alert and move the keyboard focus to it, once.
  const focusShown = shown !== null && shown.some((check) => check.id === focusId);
  useEffect(() => {
    if (focusId === null || !focusShown || focusDone.current) {
      return;
    }
    focusDone.current = true;
    const element = document.getElementById(`alert-${focusId}`);
    element?.scrollIntoView({ block: "center" });
    element?.focus({ preventScroll: true });
  }, [focusId, focusShown]);

  function toggleSound() {
    const next = !sound && enableAlertSound();
    soundRef.current = next;
    setSound(next);
    if (next) {
      playAlertSound(); // a short sample, so the user knows how it sounds
    }
  }

  return (
    <div className="alerts">
      {/* A live region: screen readers read new alerts aloud wherever the focus is. */}
      <p role="status" className="sr-only">
        {announcement}
      </p>
      <div className="alerts-tools">
        {live === null ? null : (
          <p className={live ? "alerts-live" : "alerts-live alerts-live-lost"}>
            {live ? bg.alerts.live : bg.alerts.liveLost}
          </p>
        )}
        <Button variant="secondary" aria-pressed={sound} onClick={toggleSound}>
          {sound ? bg.alerts.soundOff : bg.alerts.soundOn}
        </Button>
        {sound ? <p className="muted">{bg.alerts.soundEnabled}</p> : null}
      </div>
      {focusMissing ? (
        <p role="alert" className="form-message form-message-error">
          {bg.alerts.focusNotFound}
        </p>
      ) : null}
      {loadFailed ? (
        <p role="alert" className="form-message form-message-error">
          {bg.alerts.refreshFailed}
        </p>
      ) : null}
      {shown === null && !loadFailed ? (
        <p role="status" className="muted">
          {bg.alerts.loading}
        </p>
      ) : null}
      {shown !== null && shown.length === 0 ? <p className="muted">{bg.alerts.empty}</p> : null}
      {shown !== null && shown.length > 0 ? (
        <ol className="check-list" aria-label={bg.alerts.listLabel}>
          {shown.map((check) => (
            <AlertItem
              key={check.id}
              check={check}
              name={personNameOf(names, check)}
              isNew={newIds.has(check.id)}
              isFocused={check.id === focusId}
            />
          ))}
        </ol>
      ) : null}
    </div>
  );
}

type AckState =
  | { kind: "idle" }
  | { kind: "sending" }
  | { kind: "done"; text: string }
  | { kind: "error"; text: string };

// One alert: who, when, the verdict, who the caller claimed to be, and the button.
function AlertItem({
  check,
  name,
  isNew,
  isFocused,
}: {
  check: CheckDto;
  name: string;
  isNew: boolean;
  isFocused: boolean;
}) {
  const [ack, setAck] = useState<AckState>({ kind: "idle" });
  const time = formatDateTime(check.startedAt);

  async function acknowledge() {
    setAck({ kind: "sending" });
    const result = await callApi<AcknowledgeResultDto>(
      `/api/checks/${check.id}/acknowledge`,
      "POST",
    );
    setAck(
      result.ok
        ? { kind: "done", text: responderMessage(result.data) }
        : { kind: "error", text: result.messageBg },
    );
  }

  const classes = ["check-item", "alert-item"];
  if (isNew) classes.push("alert-new");
  if (isFocused) classes.push("alert-focused");
  const showButton =
    check.acknowledgement === null &&
    (ack.kind === "idle" || ack.kind === "sending" || ack.kind === "error");

  return (
    // tabIndex -1: the page can move the focus here (?check=), but Tab skips it.
    <li id={`alert-${check.id}`} className={classes.join(" ")} tabIndex={-1}>
      <h2 className="alert-person">{name}</h2>
      {isNew || isFocused ? (
        <p className="alert-tags">
          {isNew ? <span className="alert-tag">{bg.alerts.newBadge}</span> : null}
          {isFocused ? <span className="alert-tag">{bg.alerts.focusedBadge}</span> : null}
        </p>
      ) : null}
      <p className="check-time">{time}</p>
      <VerdictBadge level={check.verdict?.level ?? null} />
      <p>{statusText(check)}</p>
      <p>{identityText(check)}</p>
      {ack.kind === "done" ? (
        <p role="status" className="alert-responded">
          {ack.text}
        </p>
      ) : null}
      {check.acknowledgement !== null ? (
        <p className="muted">{acknowledgementText(check)}</p>
      ) : null}
      {showButton ? (
        <div className="alert-actions">
          <Button
            className="alert-call"
            onClick={() => void acknowledge()}
            disabled={ack.kind === "sending"}
            aria-label={
              ack.kind === "sending" ? undefined : fill(bg.alerts.callNowLabel, { name, time })
            }
          >
            {ack.kind === "sending" ? bg.alerts.sending : bg.alerts.callNow}
          </Button>
          <p className="muted">{fill(bg.alerts.callNowHint, { name })}</p>
          {ack.kind === "error" ? (
            <p role="alert" className="form-message form-message-error">
              {ack.text}
            </p>
          ) : null}
        </div>
      ) : null}
    </li>
  );
}
