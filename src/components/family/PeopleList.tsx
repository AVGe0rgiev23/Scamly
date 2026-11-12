// The list of protected persons on /family: everyone the logged-in family member
// owns or is a trusted contact of (GET /api/persons; RLS decides who is in it).
// A Client Component: it asks our API from the browser, so it can show a skeleton
// while loading, a Bulgarian error with „Опитай отново“, and an empty state.
// The people are hairline-separated rows; the whole row is the link.
"use client";

import { ChevronRight } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { ROUTES } from "@/config/routes";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Notice } from "@/components/ui/Notice";
import { SkeletonList } from "@/components/ui/Skeleton";
import { SignalLine } from "@/components/ui/SignalLine";
import { bg } from "@/i18n/bg";
import { callApi, type PersonDto } from "./api";
import { districtName } from "./format";

// What the list shows right now. A "tagged union": like a Python class hierarchy
// where `kind` says which of the four shapes it is.
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
      <div className="border-t border-line">
        <p role="status" className="sr-only">
          {bg.family.listLoading}
        </p>
        <SkeletonList rows={2} />
      </div>
    );
  }

  if (state.kind === "error") {
    return (
      <div className="flex flex-col items-start gap-4">
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
      <div className="rounded-lg border border-dashed border-line-strong px-5 py-8 md:px-8 md:py-10">
        <SignalLine state="idle" className="mb-5 h-5 max-w-40 text-fg-subtle" />
        <h2 className="text-h3">{bg.family.emptyTitle}</h2>
        <p className="mt-2 max-w-[60ch] text-fg-muted">{bg.family.emptyText}</p>
        <ButtonLink href={`${ROUTES.family}/new`} variant="secondary" className="mt-5">
          {bg.family.addPerson}
        </ButtonLink>
      </div>
    );
  }

  return (
    <ul className="border-t border-line">
      {state.persons.map((person) => (
        <li
          key={person.id}
          className="relative flex items-center gap-4 border-b border-line py-5 hover:bg-surface-1"
        >
          <div className="min-w-0 flex-1">
            <h2 className="font-display text-h3">
              {/* The link covers the whole row (after:inset-0), so the tap target is big. */}
              <Link
                href={`${ROUTES.family}/${person.id}`}
                className="after:absolute after:inset-0 after:content-['']"
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
          <ChevronRight className="size-6 shrink-0 text-fg-muted" aria-hidden="true" />
        </li>
      ))}
    </ul>
  );
}
