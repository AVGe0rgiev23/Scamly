// The page of one protected person (/family/[personId]). It loads the person, the
// ordered contact list and the paired phones once (GET /api/persons/:id) and shows
// one section per job. Only the owner gets the forms that change something; a
// trusted contact sees the same data read-only. The API checks this again: a
// change sent by a non-owner gets 404, whatever the page shows.
// Look: a 12-column layout on a computer. The main column holds the check history
// first, then the call order and the invite; the side column holds the pairing code,
// the paired phones and the settings (with „Изтрий“ at its very bottom). On a phone
// the two columns stack. Sections are separated by hairlines, not boxes.
"use client";

import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useEffect, useId, useState, type ReactNode } from "react";
import { ROUTES } from "@/config/routes";
import { Button } from "@/components/ui/Button";
import { cn } from "@/components/ui/cn";
import { Notice } from "@/components/ui/Notice";
import { Skeleton, SkeletonList, SkeletonText } from "@/components/ui/Skeleton";
import { bg } from "@/i18n/bg";
import {
  callApi,
  type ContactDto,
  type DeviceDto,
  type PersonDetailsDto,
  type PersonDto,
} from "./api";
import { CheckHistory } from "./CheckHistory";
import { ContactsEditor } from "./ContactsEditor";
import { BACK_LINK } from "./CreatePersonPage";
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
// The first section of a column has no hairline above it (`first` = true).
export function Section({
  title,
  first = false,
  children,
}: {
  title: string;
  first?: boolean;
  children: ReactNode;
}) {
  const titleId = useId();
  return (
    <section
      aria-labelledby={titleId}
      className={cn("min-w-0 py-8", first ? "pt-0" : "border-t border-line")}
    >
      <h2 id={titleId} className="mb-4 text-h3">
        {title}
      </h2>
      {children}
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
    <Link href={ROUTES.family} className={BACK_LINK}>
      <ArrowLeft className="size-5" aria-hidden="true" />
      {bg.family.backToList}
    </Link>
  );

  if (state.kind === "loading") {
    return (
      <>
        {backLink}
        <p role="status" className="sr-only">
          {bg.family.personLoading}
        </p>
        {/* The shape of the page: name, two lines, then the two columns. */}
        <Skeleton className="h-12 w-3/5 max-w-md" />
        <SkeletonText lines={2} className="mt-4 max-w-sm" />
        <div className="mt-10 grid gap-x-6 gap-y-10 md:grid-cols-12">
          <SkeletonList rows={3} className="md:col-span-7" />
          <Skeleton className="h-64 w-full md:col-span-4 md:col-start-9" />
        </div>
      </>
    );
  }

  if (state.kind === "error") {
    return (
      <>
        {backLink}
        <div className="flex max-w-xl flex-col items-start gap-4">
          <Notice status="danger" role="alert" className="w-full">
            {state.message}
          </Notice>
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
      <header className="mb-10 max-w-[60ch]">
        <h1 className="text-h1">{person.displayName}</h1>
        <p className="mt-4 text-lg text-fg-muted">
          {bg.family.district}: {districtName(person.districtCode)}
        </p>
        <p className="text-fg-subtle">
          {person.isOwner ? bg.family.roleOwner : bg.family.roleContact}
        </p>
        {person.isOwner ? null : (
          <Notice status="info" className="mt-6">
            {bg.family.readOnlyNote}
          </Notice>
        )}
      </header>

      <div className="grid gap-x-6 md:grid-cols-12">
        <div className="min-w-0 md:col-span-7">
          <Section title={bg.family.historyTitle} first>
            <CheckHistory personId={person.id} />
          </Section>

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
        </div>

        <div className="min-w-0 border-t border-line pt-8 md:col-span-5 md:border-t-0 md:border-l md:pt-0 md:pl-6 lg:col-span-4 lg:col-start-9">
          {person.isOwner ? (
            <Section title={bg.family.pairingTitle} first>
              <PairingPanel personId={person.id} />
            </Section>
          ) : null}

          <Section title={bg.family.devicesTitle} first={!person.isOwner}>
            <DevicesList
              personId={person.id}
              devices={devices}
              canEdit={person.isOwner}
              onChange={updateDevices}
            />
          </Section>

          {person.isOwner ? (
            <Section title={bg.family.settingsTitle}>
              <PersonSettings person={person} onUpdated={updatePerson} />
            </Section>
          ) : null}
        </div>
      </div>
    </>
  );
}
