// The page of one protected person (/family/[personId]). It loads the person, the
// ordered contact list and the paired phones once (GET /api/persons/:id) and shows
// one section per job. Only the owner gets the forms that change something; a
// trusted contact sees the same data read-only. The API checks this again: a
// change sent by a non-owner gets 404, whatever the page shows.
//
// Look (Redesign v3 Phase 4, family.css): a head with the initials in a big halo
// ring, the name, the district, who gets the alerts (AvatarStack of the call order)
// and how many phones are paired; then tabs with a sliding pill (ui/Tabs):
//   Проверки   the check history as a timeline;
//   Телефони   the pairing code (owner) and the paired phones;
//   Близки     the call order and, for the owner, the invite;
//   Настройки  name and district, and the red-tinted danger zone last (owner only).
// Every panel stays mounted and is only hidden, so a half-edited contact list or a
// running pairing countdown survives a tab switch. The address remembers the tab
// (#proverki, #telefoni, #blizki, #nastroyki), so a link can open a tab directly.
"use client";

import { ArrowLeft, Smartphone } from "lucide-react";
import Link from "next/link";
import { useEffect, useId, useState, type ReactNode } from "react";
import { ROUTES } from "@/config/routes";
import { AvatarStack, initialsOf } from "@/components/ui/AvatarStack";
import { Button } from "@/components/ui/Button";
import { cn } from "@/components/ui/cn";
import { Notice } from "@/components/ui/Notice";
import { Skeleton, SkeletonList, SkeletonText } from "@/components/ui/Skeleton";
import { TabPanel, Tabs, type TabItem } from "@/components/ui/Tabs";
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
import { devicesText } from "./PeopleList";
import { PersonSettings } from "./PersonSettings";

type DashboardState =
  | { kind: "loading" }
  | { kind: "error"; message: string }
  | { kind: "ready"; details: PersonDetailsDto };

type TabId = "checks" | "phones" | "contacts" | "settings";

// The tab <-> the part of the address after "#" (Latin letters, like our routes).
const HASH_OF: Record<TabId, string> = {
  checks: "proverki",
  phones: "telefoni",
  contacts: "blizki",
  settings: "nastroyki",
};

function tabFromAddress(): TabId {
  if (typeof window === "undefined") return "checks";
  const wanted = window.location.hash.slice(1);
  // Object.keys gives plain strings; `as` tells TypeScript they are tab ids.
  const found = (Object.keys(HASH_OF) as TabId[]).find((id) => HASH_OF[id] === wanted);
  return found ?? "checks";
}

// One titled part of the page. aria-labelledby names the <section> after its <h2>,
// so a screen reader can jump between the parts. `className` places it in a grid.
export function Section({
  title,
  className,
  children,
}: {
  title: string;
  className?: string;
  children: ReactNode;
}) {
  const titleId = useId();
  return (
    <section aria-labelledby={titleId} className={cn("family-section min-w-0", className)}>
      <h2 id={titleId} className="family-section-title">
        {title}
      </h2>
      {children}
    </section>
  );
}

export function PersonDashboard({ personId }: { personId: string }) {
  const [state, setState] = useState<DashboardState>({ kind: "loading" });
  const [attempt, setAttempt] = useState(0);
  // The tab named in the address (#telefoni …), else „Проверки“. Safe to read the
  // address here: the tabs are drawn only after the data has loaded in the browser.
  const [tab, setTab] = useState<TabId>(tabFromAddress);
  const baseId = useId();

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

  function chooseTab(id: TabId) {
    setTab(id);
    // Remember the tab in the address without a new history entry or a scroll jump.
    window.history.replaceState(null, "", `#${HASH_OF[id]}`);
  }

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
        {/* The shape of the page: the head, the tabs, then a list. */}
        <div className="flex items-center gap-5">
          <Skeleton className="size-20 shrink-0 rounded-full" />
          <div className="flex-1">
            <Skeleton className="h-12 w-3/5 max-w-md" />
            <SkeletonText lines={1} className="mt-4 max-w-sm" />
          </div>
        </div>
        <Skeleton className="mt-10 h-14 w-full max-w-lg rounded-full" />
        <SkeletonList rows={3} className="mt-8 max-w-3xl" />
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
  const activeDevices = devices.filter((device) => !device.revoked).length;
  const callOrder = [...contacts]
    .sort((a, b) => a.priority - b.priority)
    .map((contact) => ({ id: contact.id, name: contact.displayName }));

  const tabs: TabItem<TabId>[] = [
    { id: "checks", label: bg.family.tabChecks },
    { id: "phones", label: bg.family.tabPhones, count: activeDevices },
    { id: "contacts", label: bg.family.tabContacts, count: contacts.length },
  ];
  if (person.isOwner) {
    tabs.push({ id: "settings", label: bg.family.tabSettings });
  }
  // A trusted contact has no „Настройки“: an old #nastroyki link opens „Проверки“.
  const current: TabId = tabs.some((item) => item.id === tab) ? tab : "checks";
  const tabId = (id: TabId) => `${baseId}-tab-${id}`;
  const panelId = (id: TabId) => `${baseId}-panel-${id}`;

  // One panel: mounted always, hidden unless its tab is chosen.
  function panel(id: TabId, children: ReactNode) {
    return (
      <div hidden={current !== id}>
        <TabPanel id={panelId(id)} labelledBy={tabId(id)} className="family-panel">
          {children}
        </TabPanel>
      </div>
    );
  }

  return (
    <>
      {backLink}
      <header className="family-person-head">
        <span className="family-avatar family-avatar-lg" aria-hidden="true">
          {initialsOf(person.displayName)}
        </span>
        <div className="min-w-0 flex-1">
          <h1 className="text-h1">{person.displayName}</h1>
          <p className="mt-3 text-lg text-fg-muted">
            {bg.family.district}: {districtName(person.districtCode)}
          </p>
          <p className="text-fg-subtle">
            {person.isOwner ? bg.family.roleOwner : bg.family.roleContact}
          </p>
        </div>
        <dl className="family-head-facts">
          <div>
            <dt className="eyebrow">{bg.family.contactsTitle}</dt>
            <dd className="mt-2">
              <AvatarStack people={callOrder} label={bg.family.contactsTitle} max={5} />
            </dd>
          </div>
          <div>
            <dt className="eyebrow">{bg.family.tabPhones}</dt>
            <dd className="mt-2 inline-flex min-h-10 items-center gap-2 text-fg">
              <Smartphone className="size-5 text-fg-muted" aria-hidden="true" />
              {devicesText(activeDevices)}
            </dd>
          </div>
        </dl>
      </header>
      {person.isOwner ? null : (
        <Notice status="info" className="mb-8 max-w-3xl">
          {bg.family.readOnlyNote}
        </Notice>
      )}

      <Tabs
        label={bg.family.tabsLabel}
        tabs={tabs}
        value={current}
        onChange={chooseTab}
        tabId={tabId}
        panelId={panelId}
        className="family-tabs"
      />

      {panel(
        "checks",
        <Section title={bg.family.historyTitle} className="max-w-3xl">
          <CheckHistory personId={person.id} />
        </Section>,
      )}

      {panel(
        "phones",
        <div className="family-panel-grid">
          {person.isOwner ? (
            <Section title={bg.family.pairingTitle} className="lg:col-span-7">
              <PairingPanel personId={person.id} />
            </Section>
          ) : null}
          <Section
            title={bg.family.devicesTitle}
            className={person.isOwner ? "lg:col-span-5" : "lg:col-span-8"}
          >
            <DevicesList
              personId={person.id}
              devices={devices}
              canEdit={person.isOwner}
              onChange={updateDevices}
            />
          </Section>
        </div>,
      )}

      {panel(
        "contacts",
        <div className="family-panel-grid">
          <Section
            title={bg.family.contactsTitle}
            className={person.isOwner ? "lg:col-span-7" : "lg:col-span-8"}
          >
            <ContactsEditor
              personId={person.id}
              contacts={contacts}
              canEdit={person.isOwner}
              onSaved={updateContacts}
            />
          </Section>
          {person.isOwner ? (
            <Section title={bg.family.inviteTitle} className="lg:col-span-5">
              <InviteForm personId={person.id} contactCount={contacts.length} />
            </Section>
          ) : null}
        </div>,
      )}

      {person.isOwner
        ? panel(
            "settings",
            <Section title={bg.family.settingsTitle} className="max-w-2xl">
              <PersonSettings person={person} onUpdated={updatePerson} />
            </Section>,
          )
        : null}
    </>
  );
}
