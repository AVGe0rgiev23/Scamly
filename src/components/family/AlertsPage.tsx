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
//   0. On top: „Провери истинския“ (P-06, IdentityRequests): my open questions „Ти ли
//      си?“ (link to /family/proveri?id=…) and the family's warnings of the last 24 h.
//   5. „Обаждам ѝ се сега“ sends POST /api/checks/:id/acknowledge. The first family
//      member to press it "takes the call" („Вие поехте обаждането.“); the older
//      person's phone then shows „<Име> ще ви се обади веднага.“ (Roberta's W2-01).
//
// The protected person's phone number is not stored (the API has none), so there is
// no tel: link here; the family member calls the number they know.
//
// Look (Redesign v3 „Ореол“, Phase 4, family.css):
//   - a glass toolbar with the connection pill and the sound switch;
//   - the ALERT ISLAND: the alerts that need attention now (a new one, the one from
//     the notification, or the newest one nobody has answered yet) arrive as a small
//     pill and grow into a big card: a pulsing halo, the risk arc, who the caller
//     claimed to be, the time and a huge „Обаждам ѝ се сега“. Once somebody answers,
//     the card settles into one calm line (the halo turns calm);
//   - under it „Всички сигнали“: a timeline with a coloured halo node per alert.
// Both lists are `.check-list`, so the tests count every alert in one place.
"use client";

import { motion, useReducedMotion } from "motion/react";
import { Check, PhoneCall, Radio, RefreshCw, Volume2, VolumeX } from "lucide-react";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { ROUTES } from "@/config/routes";
import { Badge, StatusPill } from "@/components/ui/Badge";
import { Button, ButtonLink } from "@/components/ui/Button";
import { cn } from "@/components/ui/cn";
import { HaloRings } from "@/components/ui/HaloRings";
import { REDUCED, SPRING_UI } from "@/components/ui/motion";
import { Notice } from "@/components/ui/Notice";
import { RiskMeter } from "@/components/ui/RiskMeter";
import { SkeletonList } from "@/components/ui/Skeleton";
import { EmptyState, ErrorState } from "@/components/ui/States";
import { VerdictBadge } from "@/components/ui/VerdictBadge";
import type { HaloState } from "@/components/ui/halo/haloMath";
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
import { FamilyHeader } from "./FamilyFrame";
import { IdentityRequests } from "./IdentityRequests";
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
      <FamilyHeader
        eyebrow={bg.family.homeEyebrow}
        title={bg.alerts.title}
        intro={bg.alerts.intro}
      />
      {state.kind === "loading" ? (
        <div className="max-w-3xl">
          <p role="status" className="sr-only">
            {bg.alerts.loading}
          </p>
          <SkeletonList rows={3} />
        </div>
      ) : null}
      {state.kind === "error" ? (
        <ErrorState
          className="max-w-3xl"
          text={state.message}
          retryLabel={bg.family.retry}
          onRetry={() => {
            setState({ kind: "loading" });
            setAttempt(attempt + 1);
          }}
        />
      ) : null}
      {state.kind === "ready" && state.persons.length === 0 ? (
        <EmptyState
          className="max-w-3xl"
          text={bg.alerts.noPersons}
          action={
            <ButtonLink href={`${ROUTES.family}/new`} variant="secondary">
              {bg.family.addPerson}
            </ButtonLink>
          }
        />
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
  // The newest check of the first load, if nobody has answered it yet: it opens in
  // the island too (a new visitor sees what needs them first).
  const [leadId, setLeadId] = useState<string | null>(null);
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
        const firstLoad = known === null;
        const added = findNewCheckIds(known, fresh);
        known = new Set([...(known ?? []), ...fresh.map((check) => check.id)]);
        setChecks(fresh);
        setLoadFailed(false);
        if (firstLoad) {
          const newest = newestFirst(fresh)[0];
          setLeadId(newest !== undefined && newest.acknowledgement === null ? newest.id : null);
        }
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

  // The island holds the alerts that need attention now; the timeline the rest.
  const isHero = (check: CheckDto) =>
    newIds.has(check.id) || check.id === focusId || check.id === leadId;
  const heroes = shown === null ? [] : shown.filter(isHero);
  const others = shown === null ? [] : shown.filter((check) => !isHero(check));

  function item(check: CheckDto, hero: boolean) {
    return (
      <AlertItem
        key={check.id}
        check={check}
        name={personNameOf(names, check)}
        isNew={newIds.has(check.id)}
        isFocused={check.id === focusId}
        hero={hero}
      />
    );
  }

  return (
    <div className="alerts flex max-w-5xl flex-col gap-6">
      {/* A live region: screen readers read new alerts aloud wherever the focus is. */}
      <p role="status" className="sr-only">
        {announcement}
      </p>
      <IdentityRequests personIds={persons.map((person) => person.id)} />
      <div className="family-toolbar">
        {live === null ? (
          <span className="family-toolbar-wait" aria-hidden="true" />
        ) : (
          <StatusPill
            status={live ? "safe" : "caution"}
            className="family-live-pill"
            data-live={live ? "on" : "off"}
            icon={
              live ? (
                <Radio className="size-[1.15em] shrink-0" aria-hidden="true" />
              ) : (
                <RefreshCw className="size-[1.15em] shrink-0" aria-hidden="true" />
              )
            }
          >
            {live ? bg.alerts.live : bg.alerts.liveLost}
          </StatusPill>
        )}
        <Button variant="secondary" aria-pressed={sound} onClick={toggleSound}>
          {sound ? (
            <VolumeX className="size-5" aria-hidden="true" />
          ) : (
            <Volume2 className="size-5" aria-hidden="true" />
          )}
          {sound ? bg.alerts.soundOff : bg.alerts.soundOn}
        </Button>
      </div>
      {sound ? <p className="-mt-3 text-sm text-fg-muted">{bg.alerts.soundEnabled}</p> : null}
      {focusMissing && !inList ? (
        <Notice status="caution" role="alert">
          {bg.alerts.focusNotFound}
        </Notice>
      ) : null}
      {loadFailed ? (
        <Notice status="danger" role="alert">
          {bg.alerts.refreshFailed}
        </Notice>
      ) : null}
      {shown === null && !loadFailed ? (
        <div>
          <p role="status" className="sr-only">
            {bg.alerts.loading}
          </p>
          <SkeletonList rows={3} />
        </div>
      ) : null}
      {shown !== null && shown.length === 0 ? <EmptyState text={bg.alerts.empty} /> : null}
      {heroes.length > 0 ? (
        <ol className="check-list family-heroes" aria-label={bg.alerts.heroLabel}>
          {heroes.map((check) => item(check, true))}
        </ol>
      ) : null}
      {others.length > 0 ? (
        <div className="mt-4">
          <p className="eyebrow mb-5">{bg.alerts.historyTitle}</p>
          <ol className="check-list family-timeline" aria-label={bg.alerts.listLabel}>
            {others.map((check) => item(check, false))}
          </ol>
        </div>
      ) : null}
    </div>
  );
}

type AckState =
  | { kind: "idle" }
  | { kind: "sending" }
  | { kind: "done"; text: string }
  | { kind: "error"; text: string };

// The verdict level as a word for CSS (`data-level`) and the halo state it means.
function levelOf(check: CheckDto): "red" | "yellow" | "green" | "pending" {
  return check.verdict?.level ?? "pending";
}
const HALO_OF: Record<ReturnType<typeof levelOf>, HaloState> = {
  red: "danger",
  yellow: "caution",
  green: "calm",
  pending: "idle",
};

// How long a new alert stays a small pill before it grows (ms): long enough to see
// it arrive, short enough that nobody waits for it.
const OPEN_AFTER_MS = 450;

// One alert: who, when, the verdict, who the caller claimed to be, and the button.
// `hero` = it lives in the island (pill → big card → calm line); otherwise it is a
// row of the timeline.
function AlertItem({
  check,
  name,
  isNew,
  isFocused,
  hero,
}: {
  check: CheckDto;
  name: string;
  isNew: boolean;
  isFocused: boolean;
  hero: boolean;
}) {
  const [ack, setAck] = useState<AckState>({ kind: "idle" });
  const reduce = useReducedMotion() ?? false;
  const [grown, setGrown] = useState(false);
  const time = formatDateTime(check.startedAt);

  // The pill grows into the card a moment after it arrives (at once with reduced motion).
  useEffect(() => {
    if (!hero) return;
    const timer = setTimeout(() => setGrown(true), reduce ? 0 : OPEN_AFTER_MS);
    return () => clearTimeout(timer);
  }, [hero, reduce]);

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

  const showButton =
    check.acknowledgement === null &&
    (ack.kind === "idle" || ack.kind === "sending" || ack.kind === "error");
  const answered = !showButton;
  const level = levelOf(check);
  const mode = !hero ? "row" : answered ? "settled" : grown ? "open" : "pill";

  const badges = (
    <>
      {isNew ? <Badge status="info">{bg.alerts.newBadge}</Badge> : null}
      {isFocused ? <Badge>{bg.alerts.focusedBadge}</Badge> : null}
    </>
  );

  const callButton = (big: boolean) => (
    <div className={cn("flex flex-col gap-2", big ? "mt-6" : "mt-4 items-start")}>
      <Button
        size={big ? "xl" : "md"}
        variant={big ? "primary" : "secondary"}
        className={cn(big ? "family-call w-full" : "w-full sm:w-auto")}
        onClick={() => void acknowledge()}
        loading={ack.kind === "sending"}
        aria-label={
          ack.kind === "sending" ? undefined : fill(bg.alerts.callNowLabel, { name, time })
        }
      >
        {ack.kind === "sending" ? null : (
          <PhoneCall className={big ? "size-6" : "size-5"} aria-hidden="true" />
        )}
        {ack.kind === "sending" ? bg.alerts.sending : bg.alerts.callNow}
      </Button>
      <p
        className={cn("max-w-[60ch] text-sm", big ? "text-center text-fg-muted" : "text-fg-muted")}
      >
        {fill(bg.alerts.callNowHint, { name })}
      </p>
      {ack.kind === "error" ? (
        <Notice status="danger" role="alert" className="w-full">
          {ack.text}
        </Notice>
      ) : null}
    </div>
  );

  const answeredText =
    ack.kind === "done" ? (
      <p role="status" className="family-answered">
        {ack.text}
      </p>
    ) : check.acknowledgement !== null ? (
      <p className="mt-1 text-sm text-fg-muted">{acknowledgementText(check)}</p>
    ) : null;

  return (
    // tabIndex -1: the page can move the focus here (?check=), but Tab skips it.
    // `alert-new` and `alert-focused` are test hooks (family.css draws them).
    <li
      id={`alert-${check.id}`}
      tabIndex={-1}
      data-level={level}
      data-mode={mode}
      className={cn(
        hero ? "family-hero-item" : "family-tl-item",
        isNew && "alert-new",
        isFocused && "alert-focused",
      )}
    >
      {hero ? (
        <motion.div
          layout
          transition={reduce ? REDUCED : SPRING_UI}
          // The radius is set here (not in CSS) so motion keeps it round while the
          // box is scaled during the animation.
          style={{ borderRadius: mode === "pill" ? 999 : mode === "open" ? 32 : 24 }}
          // The red card is always dark, in both themes (like the older person's red verdict).
          data-theme={mode === "open" && level === "red" ? "dark" : undefined}
          data-level={level}
          data-mode={mode}
          className="family-island"
        >
          {mode === "pill" ? (
            <motion.p layout="position" className="family-island-pill">
              <span className="family-island-dot" aria-hidden="true" />
              <span className="min-w-0 truncate">{fill(bg.alerts.announceNew, { name })}</span>
            </motion.p>
          ) : null}

          {mode === "open" ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1, transition: reduce ? REDUCED : { duration: 0.3, delay: 0.1 } }}
              className="family-island-body"
            >
              <div className="family-island-top">
                <span className="family-island-dot" aria-hidden="true" />
                {check.verdict ? (
                  <p className="family-island-headline">{check.verdict.headlineBg}</p>
                ) : null}
                <span className="flex flex-wrap gap-2">{badges}</span>
                <p className="tabular w-full font-mono text-sm text-fg-muted sm:ml-auto sm:w-auto">
                  {time}
                </p>
              </div>
              <div className="family-island-grid">
                <div className="family-island-gauge">
                  <span className="family-island-pulse" aria-hidden="true" />
                  <span
                    className="family-island-pulse family-island-pulse-late"
                    aria-hidden="true"
                  />
                  <HaloRings state={HALO_OF[level]} size="100%" className="family-island-halo" />
                  {check.verdict ? (
                    <RiskMeter
                      score={check.verdict.score}
                      level={check.verdict.level}
                      label={bg.alerts.riskLabel}
                      className="family-island-meter"
                    />
                  ) : null}
                </div>
                <div className="min-w-0">
                  <h2 className="font-display text-h2 font-semibold tracking-tight">{name}</h2>
                  <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2">
                    <VerdictBadge level={check.verdict?.level ?? null} />
                    <p className="font-medium text-fg">{statusText(check)}</p>
                  </div>
                  <p className="family-claim">{identityText(check)}</p>
                  {callButton(true)}
                </div>
              </div>
            </motion.div>
          ) : null}

          {mode === "settled" ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1, transition: reduce ? REDUCED : { duration: 0.3, delay: 0.1 } }}
              className="family-settled"
            >
              <span className="family-settled-mark" aria-hidden="true">
                <Check className="size-6" strokeWidth={2.5} />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                  <h2 className="font-display text-xl font-semibold">{name}</h2>
                  {badges}
                </div>
                {answeredText}
                <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-fg-muted">
                  <VerdictBadge level={check.verdict?.level ?? null} />
                  <span className="tabular font-mono">{time}</span>
                  <span>{statusText(check)}</span>
                  <span>{identityText(check)}</span>
                </div>
              </div>
            </motion.div>
          ) : null}
        </motion.div>
      ) : (
        <>
          <span className="family-node" data-level={level} aria-hidden="true" />
          <div className="family-tl-card">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
              <h2 className="font-display text-xl font-semibold">{name}</h2>
              {badges}
              <p className="tabular w-full font-mono text-sm text-fg-muted sm:ml-auto sm:w-auto">
                {time}
              </p>
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-2">
              <VerdictBadge level={check.verdict?.level ?? null} />
              <p className="text-fg">{statusText(check)}</p>
            </div>
            <p className="mt-2 text-fg-muted">{identityText(check)}</p>
            {answeredText}
            {showButton ? callButton(false) : null}
          </div>
        </>
      )}
    </li>
  );
}
