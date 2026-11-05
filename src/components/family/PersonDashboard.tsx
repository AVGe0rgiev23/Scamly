// The page of one protected person (/family/[personId]). It loads the person, the
// ordered contact list and the paired phones once (GET /api/persons/:id) and shows
// one section per job. Only the owner gets the forms that change something; a
// trusted contact sees the same data read-only. The API checks this again: a
// change sent by a non-owner gets 404, whatever the page shows.
"use client";

import Link from "next/link";
import { useEffect, useId, useState, type ReactNode } from "react";
import { ROUTES } from "@/config/routes";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { bg } from "@/i18n/bg";
import {
  callApi,
  type ContactDto,
  type DeviceDto,
  type PersonDetailsDto,
  type PersonDto,
} from "./api";
import { ContactsEditor } from "./ContactsEditor";
import { DevicesList } from "./DevicesList";
import { districtName } from "./format";
import { InviteForm } from "./InviteForm";
import { PairingPanel } from "./PairingPanel";
import { PersonSettings } from "./PersonSettings";

type DashboardState =
  | { kind: "loading" }
  | { kind: "error"; message: string }
  | { kind: "ready"; details: PersonDetailsDto };

// One titled part of the page. aria-labelledby names the <section> after its <h2>,
// so a screen reader can jump between the parts.
export function Section({ title, children }: { title: string; children: ReactNode }) {
  const titleId = useId();
  return (
    <section aria-labelledby={titleId}>
      <Card className="family-section">
        <h2 id={titleId}>{title}</h2>
        {children}
      </Card>
    </section>
  );
}

export function PersonDashboard({ personId }: { personId: string }) {
  const [state, setState] = useState<DashboardState>({ kind: "loading" });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let active = true;
    async function load() {
      const result = await callApi<PersonDetailsDto>(`/api/persons/${personId}`);
      if (!active) return;
      setState(
        result.ok
          ? { kind: "ready", details: result.data }
          : { kind: "error", message: result.messageBg },
      );
    }
    void load();
    return () => {
      active = false;
    };
  }, [personId, attempt]);

  // The sections report their saved changes here, so the header stays up to date.
  function updatePerson(person: PersonDto) {
    setState((old) =>
      old.kind === "ready" ? { kind: "ready", details: { ...old.details, person } } : old,
    );
  }
  function updateContacts(contacts: ContactDto[]) {
    setState((old) =>
      old.kind === "ready" ? { kind: "ready", details: { ...old.details, contacts } } : old,
    );
  }

  function updateDevices(devices: DeviceDto[]) {
    setState((old) =>
      old.kind === "ready" ? { kind: "ready", details: { ...old.details, devices } } : old,
    );
  }

  const backLink = (
    <Link href={ROUTES.family} className="family-back">
      ← {bg.family.backToList}
    </Link>
  );

  if (state.kind === "loading") {
    return (
      <>
        {backLink}
        <p role="status" className="muted">
          {bg.family.personLoading}
        </p>
      </>
    );
  }

  if (state.kind === "error") {
    return (
      <>
        {backLink}
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
      </>
    );
  }

  const { person, contacts, devices } = state.details;
  return (
    <>
      {backLink}
      <header className="family-heading">
        <h1>{person.displayName}</h1>
        <p>
          {bg.family.district}: {districtName(person.districtCode)}
        </p>
        <p className="muted">{person.isOwner ? bg.family.roleOwner : bg.family.roleContact}</p>
        {person.isOwner ? null : <p className="muted">{bg.family.readOnlyNote}</p>}
      </header>

      <Section title={bg.family.devicesTitle}>
        <DevicesList
          personId={person.id}
          devices={devices}
          canEdit={person.isOwner}
          onChange={updateDevices}
        />
      </Section>

      {person.isOwner ? (
        <Section title={bg.family.pairingTitle}>
          <PairingPanel personId={person.id} />
        </Section>
      ) : null}

      <Section title={bg.family.contactsTitle}>
        <ContactsEditor
          personId={person.id}
          contacts={contacts}
          canEdit={person.isOwner}
          onSaved={updateContacts}
        />
      </Section>

      {person.isOwner ? (
        <Section title={bg.family.inviteTitle}>
          <InviteForm personId={person.id} contactCount={contacts.length} />
        </Section>
      ) : null}

      {person.isOwner ? (
        <Section title={bg.family.settingsTitle}>
          <PersonSettings person={person} onUpdated={updatePerson} />
        </Section>
      ) : null}
    </>
  );
}
