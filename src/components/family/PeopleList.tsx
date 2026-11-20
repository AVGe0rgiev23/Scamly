// The list of protected persons on /family: everyone the logged-in family member
// owns or is a trusted contact of (GET /api/persons; RLS decides who is in it).
// A Client Component: it asks our API from the browser, so it can show a skeleton
// while loading, a Bulgarian error with „Опитай отново“, and an empty state.
//
// Look (Redesign v3 Phase 4, family.css .family-person): each person is a rich card
// — the initials in a halo ring, the name (the link covers the whole card), the
// district and the role, then two facts read from our existing API only:
//   - the last check (GET /api/checks?personId=…, its newest item) as a verdict badge
//     with its time; the ring around the initials takes the verdict's colour;
//   - how many paired phones are active (GET /api/persons/:id, the `devices` list).
// While the facts load the card shows quiet skeleton lines; if they cannot load the
// card simply leaves them out (the name and the link always work).
"use client";

import { ArrowUpRight, Smartphone } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { ROUTES } from "@/config/routes";
import { initialsOf } from "@/components/ui/AvatarStack";
import { Button, ButtonLink } from "@/components/ui/Button";
import { HaloRings } from "@/components/ui/HaloRings";
import { Notice } from "@/components/ui/Notice";
import { Skeleton } from "@/components/ui/Skeleton";
import { VerdictBadge } from "@/components/ui/VerdictBadge";
import { bg } from "@/i18n/bg";
import { callApi, type CheckDto, type PersonDetailsDto, type PersonDto } from "./api";
import { districtName, fill, formatDateTime } from "./format";

// What the list shows right now. A "tagged union": like a Python class hierarchy
// where `kind` says which of the three shapes it is.
type ListState =
  | { kind: "loading" }
  | { kind: "error"; message: string }
  | { kind: "ready"; persons: PersonDto[] };

export function PeopleList() {
  const [state, setState] = useState<ListState>({ kind: "loading" });
  // Changing this number asks the effect below to load the list again.
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    // `active` stops an old, slow answer from overwriting a newer one.
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

  function retry() {
    setState({ kind: "loading" });
    setAttempt(attempt + 1);
  }

  if (state.kind === "loading") {
    return (
      <div className="family-people">
        <p role="status" className="sr-only">
          {bg.family.listLoading}
        </p>
        {[0, 1].map((index) => (
          <div key={index} className="family-person family-person-skeleton" aria-hidden="true">
            <div className="flex items-center gap-4">
              <Skeleton className="size-14 rounded-full" />
              <div className="flex-1">
                <Skeleton className="h-6 w-2/3" />
                <Skeleton className="mt-2 h-4 w-1/2" />
              </div>
            </div>
            <Skeleton className="mt-6 h-16 w-full" />
          </div>
        ))}
      </div>
    );
  }

  if (state.kind === "error") {
    return (
      <div className="flex max-w-2xl flex-col items-start gap-4">
        <Notice status="danger" role="alert" className="w-full">
          {state.message}
        </Notice>
        <Button variant="secondary" onClick={retry}>
          {bg.family.retry}
        </Button>
      </div>
    );
  }

  if (state.persons.length === 0) {
    return (
      <div className="family-empty">
        <HaloRings state="idle" size={120} className="family-empty-halo" />
        <div className="min-w-0">
          <h2 className="text-h3">{bg.family.emptyTitle}</h2>
          <p className="mt-2 max-w-[60ch] text-fg-muted">{bg.family.emptyText}</p>
          <ButtonLink href={`${ROUTES.family}/new`} variant="secondary" className="mt-5">
            {bg.family.addPerson}
          </ButtonLink>
        </div>
      </div>
    );
  }

  return (
    <ul className="family-people">
      {state.persons.map((person) => (
        <PersonCard key={person.id} person={person} />
      ))}
    </ul>
  );
}

// The two facts of a card. `last`: undefined = could not load, null = no check yet.
type Facts =
  | { kind: "loading" }
  | { kind: "ready"; last: CheckDto | null | undefined; devices: number | null };

// "1 свързан телефон" / "3 свързани телефона" / "Няма свързан телефон".
export function devicesText(count: number): string {
  if (count === 0) return bg.family.devicesNone;
  if (count === 1) return bg.family.devicesOne;
  return fill(bg.family.devicesMany, { n: count });
}

function PersonCard({ person }: { person: PersonDto }) {
  const [facts, setFacts] = useState<Facts>({ kind: "loading" });

  useEffect(() => {
    let active = true;
    async function load() {
      // Both requests at once (like asyncio.gather in Python).
      const [checks, details] = await Promise.all([
        callApi<{ checks: CheckDto[] }>(
          `/api/checks?${new URLSearchParams({ personId: person.id }).toString()}`,
        ),
        callApi<PersonDetailsDto>(`/api/persons/${person.id}`),
      ]);
      if (!active) return;
      setFacts({
        kind: "ready",
        last: checks.ok ? (checks.data.checks[0] ?? null) : undefined,
        devices: details.ok
          ? details.data.devices.filter((device) => !device.revoked).length
          : null,
      });
    }
    void load();
    return () => {
      active = false;
    };
  }, [person.id]);

  const level =
    facts.kind === "ready" && facts.last ? (facts.last.verdict?.level ?? "pending") : "none";

  return (
    <li className="family-person" data-level={level}>
      <div className="flex items-start gap-4">
        <span className="family-avatar" aria-hidden="true">
          {initialsOf(person.displayName)}
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="font-display text-h3 font-semibold">
            {/* The link covers the whole card (after:inset-0), so the tap target is big. */}
            <Link
              href={`${ROUTES.family}/${person.id}`}
              className="family-person-link after:absolute after:inset-0 after:rounded-[inherit] after:content-['']"
            >
              {person.displayName}
            </Link>
          </h2>
          <p className="mt-1 text-fg-muted">
            {bg.family.district}: {districtName(person.districtCode)}
          </p>
          <p className="text-sm text-fg-subtle">
            {person.isOwner ? bg.family.roleOwner : bg.family.roleContact}
          </p>
        </div>
        <ArrowUpRight className="family-person-arrow" aria-hidden="true" />
      </div>
      <div className="family-facts">
        <div className="family-fact">
          <p className="eyebrow">{bg.family.lastCheck}</p>
          {facts.kind === "loading" ? (
            <Skeleton className="h-7 w-40" />
          ) : facts.last === undefined ? (
            <p className="text-fg-subtle">—</p>
          ) : facts.last === null ? (
            <p className="text-fg-muted">{bg.family.noChecksYet}</p>
          ) : (
            <div className="family-fact-value">
              <VerdictBadge level={facts.last.verdict?.level ?? null} />
              <span className="tabular font-mono text-xs text-fg-muted">
                {formatDateTime(facts.last.startedAt)}
              </span>
            </div>
          )}
        </div>
        <div className="family-fact">
          <p className="eyebrow">{bg.family.tabPhones}</p>
          {facts.kind === "loading" ? (
            <Skeleton className="h-6 w-32" />
          ) : facts.devices === null ? (
            <p className="text-fg-subtle">—</p>
          ) : (
            <p className="inline-flex items-center gap-2 text-fg">
              <Smartphone className="size-4 text-fg-muted" aria-hidden="true" />
              {devicesText(facts.devices)}
            </p>
          )}
        </div>
      </div>
    </li>
  );
}
