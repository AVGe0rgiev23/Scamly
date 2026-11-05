// The list of protected persons on /family: everyone the logged-in family member
// owns or is a trusted contact of (GET /api/persons; RLS decides who is in it).
// A Client Component: it asks our API from the browser, so it can show a loading
// text, a Bulgarian error with „Опитай отново“, and an empty state.
"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ROUTES } from "@/config/routes";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
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
      <p role="status" className="muted">
        {bg.family.listLoading}
      </p>
    );
  }

  if (state.kind === "error") {
    return (
      <div className="family-error">
        <p role="alert" className="form-message form-message-error">
          {state.message}
        </p>
        <Button variant="secondary" onClick={retry}>
          {bg.family.retry}
        </Button>
      </div>
    );
  }

  if (state.persons.length === 0) {
    return (
      <Card className="family-empty">
        <h2>{bg.family.emptyTitle}</h2>
        <p>{bg.family.emptyText}</p>
        <Link href={`${ROUTES.family}/new`} className="button button-primary">
          {bg.family.addPerson}
        </Link>
      </Card>
    );
  }

  return (
    <ul className="person-list">
      {state.persons.map((person) => (
        <li key={person.id}>
          <Card className="person-card">
            <h2>
              {/* The link covers the whole card (CSS ::after), so the tap target is big. */}
              <Link href={`${ROUTES.family}/${person.id}`} className="person-link">
                {person.displayName}
              </Link>
            </h2>
            <p>
              {bg.family.district}: {districtName(person.districtCode)}
            </p>
            <p className="muted">{person.isOwner ? bg.family.roleOwner : bg.family.roleContact}</p>
          </Card>
        </li>
      ))}
    </ul>
  );
}
