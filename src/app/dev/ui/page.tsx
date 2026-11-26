// /dev/ui: the living style guide of the design system v3 „Ореол“. On top a hero Stage
// with the live WebGL halo and a switcher for its four states (idle, calm, caution,
// danger). Below, every primitive of src/components/ui in its states, once in the
// light („Porcelain“) and once in the dark („Night aurora“) theme: side by side on a
// wide screen, one under the other on a phone (a data-theme attribute on each half
// switches its colours). Used by the browser tests (tests/e2e/ui.spec.ts) and to
// review the design.
"use client";

import { Info, Phone, ShieldAlert } from "lucide-react";
import { useState } from "react";
import { AvatarStack } from "@/components/ui/AvatarStack";
import { Badge, StatusPill } from "@/components/ui/Badge";
import { BigChoice } from "@/components/ui/BigChoice";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Dialog, Sheet } from "@/components/ui/Dialog";
import { Divider } from "@/components/ui/Divider";
import { DynamicIsland } from "@/components/ui/DynamicIsland";
import { Field, Input, Select, Textarea } from "@/components/ui/Field";
import { GlassPanel } from "@/components/ui/GlassPanel";
import { HaloFieldLazy } from "@/components/ui/HaloFieldLazy";
import { HaloRings } from "@/components/ui/HaloRings";
import type { HaloState } from "@/components/ui/halo/haloMath";
import { Kbd } from "@/components/ui/Kbd";
import { Notice } from "@/components/ui/Notice";
import { RiskMeter } from "@/components/ui/RiskMeter";
import { Segmented } from "@/components/ui/Segmented";
import { SkeletonCard, SkeletonList, SkeletonMeter } from "@/components/ui/Skeleton";
import { Stage } from "@/components/ui/Stage";
import { EmptyState, ErrorState } from "@/components/ui/States";
import { TabPanel, Tabs } from "@/components/ui/Tabs";
import { toast } from "@/components/ui/Toast";
import { Checkbox, Switch } from "@/components/ui/Toggle";
import { Tooltip } from "@/components/ui/Tooltip";
import { Verdict } from "@/components/ui/Verdict";
import { VerdictBadge } from "@/components/ui/VerdictBadge";
import { SAMPLE, SAMPLE_CALLS } from "@/content/placeholders";
import { bg } from "@/i18n/bg";

const t = bg.ui;

// The four halo states with their names, in the order the switcher shows them.
const HALO_STATES: { value: HaloState; label: string }[] = [
  { value: "idle", label: t.haloIdle },
  { value: "calm", label: t.haloCalm },
  { value: "caution", label: t.haloCaution },
  { value: "danger", label: t.haloDanger },
];

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="py-8">
      <h3 className="eyebrow mb-5 font-sans">{title}</h3>
      <div className="flex flex-col gap-5">{children}</div>
    </div>
  );
}

function Samples({ theme, haloState }: { theme: "light" | "dark"; haloState: HaloState }) {
  // useState remembers a value between renders, like an instance field in Python.
  const [answer, setAnswer] = useState<string | null>(null);
  const [call, setCall] = useState<string | null>(null);
  const [clicked, setClicked] = useState(false);
  const [tab, setTab] = useState<"one" | "two">("one");
  const [open, setOpen] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [textSize, setTextSize] = useState<"normal" | "large" | "huge">("normal");
  const id = (name: string) => `${theme}-${name}`;
  return (
    <section
      data-theme={theme}
      aria-label={bg.theme[theme]}
      className="relative isolate min-w-0 overflow-hidden rounded-xl border border-glass-line bg-canvas p-5 text-fg md:p-8"
    >
      <div
        aria-hidden="true"
        className="aurora pointer-events-none absolute inset-x-0 top-0 -z-10 h-80"
      />
      <h2 className="text-h2">{bg.theme[theme]}</h2>
      <p className="mt-2 text-fg-muted">{t.typeSample}</p>
      <p className="mt-6 text-display xl:text-[length:clamp(3rem,1rem+3.4vw,5.5rem)]">
        {t.displayLead} <span className="halo-word">{t.displayWord}</span>
      </p>

      <Block title={t.sectionHalo}>
        {/* The live field in this half's theme; it follows the switcher at the top. */}
        <Stage
          aria-label={t.haloLive}
          className="min-h-56"
          data-testid={`halo-stage-${theme}`}
          field={<HaloFieldLazy state={haloState} />}
        >
          <p className="p-6 text-sm font-semibold text-fg-muted">{t.haloLive}</p>
        </Stage>
        <p className="text-sm font-semibold text-fg-muted">{t.haloStill}</p>
        <ul className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {HALO_STATES.map((halo) => (
            <li key={halo.value} className="flex flex-col items-center gap-2">
              <HaloRings state={halo.value} size={96} />
              <span className="text-sm text-fg-muted">{halo.label}</span>
            </li>
          ))}
        </ul>
      </Block>

      <Block title={t.sectionSurfaces}>
        <div className="grid gap-4 sm:grid-cols-2">
          <Card>
            <h3 className="text-h3">{t.surfaceRaised}</h3>
            <p className="mt-2 text-fg-muted">{t.surfaceText}</p>
          </Card>
          <GlassPanel spotlight>
            <h3 className="text-h3">{t.surfaceGlass}</h3>
            <p className="mt-2 text-fg-muted">{t.surfaceText}</p>
          </GlassPanel>
        </div>
        <Divider halo />
      </Block>

      <Block title={t.sectionButtons}>
        <Card>
          <h3 className="text-h3">{t.cardTitle}</h3>
          <p className="mt-2 text-fg-muted">{t.cardText}</p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Button size="xl" onClick={() => setClicked(!clicked)} aria-pressed={clicked}>
              {clicked ? t.clicked : t.primary}
            </Button>
            <Button size="xl" variant="secondary">
              {t.secondary}
            </Button>
            <Button size="xl" disabled>
              {t.disabled}
            </Button>
          </div>
        </Card>
        <div className="flex flex-wrap items-center gap-3">
          <Button size="xl" variant="ghost">
            {t.secondary}
          </Button>
          <Button size="xl" variant="danger">
            {bg.family.deleteButton}
          </Button>
          <Button size="xl" loading>
            {bg.family.saving}
          </Button>
          <Button size="xl" variant="secondary" loading>
            {bg.family.saving}
          </Button>
          <Tooltip text={t.tooltip}>
            <Button size="xl" variant="secondary" aria-label={t.tooltip}>
              <Info className="size-5" aria-hidden="true" />
            </Button>
          </Tooltip>
          <Kbd>Esc</Kbd>
          <Kbd>Ctrl</Kbd>
          <Kbd>K</Kbd>
        </div>
      </Block>

      <Block title={t.sectionFields}>
        <BigChoice question={t.question} value={answer} onChange={setAnswer} />
        <BigChoice
          question={bg.landing.demo.scenarioLabel}
          size="large"
          value={call}
          onChange={setCall}
          options={SAMPLE_CALLS.slice(0, 2).map((sample, index) => ({
            value: sample.id,
            label: sample.label,
            icon: index === 0 ? <ShieldAlert /> : <Phone />,
          }))}
        />
        <Field
          label={t.fieldLabel}
          htmlFor={id("phone")}
          hint={t.fieldHint}
          hintId={id("phone-hint")}
        >
          <Input id={id("phone")} mono inputMode="tel" aria-describedby={id("phone-hint")} />
        </Field>
        <Field
          label={t.fieldLabel}
          htmlFor={id("phone-bad")}
          error={t.fieldError}
          errorId={id("phone-err")}
        >
          <Input id={id("phone-bad")} mono aria-invalid="true" aria-describedby={id("phone-err")} />
        </Field>
        <Field label={bg.family.district} htmlFor={id("district")}>
          <Select id={id("district")} defaultValue="BG-02">
            {Object.entries(bg.districts).map(([code, name]) => (
              <option key={code} value={code}>
                {name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label={bg.landing.demo.textLabel} htmlFor={id("text")}>
          <Textarea id={id("text")} rows={3} />
        </Field>
        <Checkbox label={t.checkboxLabel} defaultChecked />
        <Switch label={t.switchLabel} defaultChecked />
        <Segmented
          label={t.segmentedLabel}
          hideGroupLabel={false}
          value={textSize}
          onChange={setTextSize}
          options={[
            { value: "normal", label: t.segmentedNormal },
            { value: "large", label: t.segmentedLarge },
            { value: "huge", label: t.segmentedHuge },
          ]}
          className="flex-wrap"
        />
      </Block>

      <Block title={t.sectionStatus}>
        <div className="flex flex-wrap gap-2">
          <VerdictBadge level="red" />
          <VerdictBadge level="yellow" />
          <VerdictBadge level="green" />
          <VerdictBadge level={null} />
          <StatusPill status="info">{bg.alerts.statusStarted}</StatusPill>
          <Badge>{bg.admin.youBadge}</Badge>
        </div>
        <Notice status="safe">{bg.family.changesSaved}</Notice>
        <Notice status="danger">{bg.errors.internal}</Notice>
        <Tabs
          label={t.tabsLabel}
          tabs={[
            { id: "one", label: t.tabOne, count: 3 },
            { id: "two", label: t.tabTwo },
          ]}
          value={tab}
          onChange={setTab}
          tabId={(tabName) => id(`tab-${tabName}`)}
          panelId={(tabName) => id(`panel-${tabName}`)}
        />
        <TabPanel id={id(`panel-${tab}`)} labelledBy={id(`tab-${tab}`)} className="text-fg-muted">
          {tab === "one" ? bg.moderator.emptyPending : bg.moderator.emptyApproved}
        </TabPanel>
        <div className="flex flex-wrap gap-3">
          <Button size="xl" variant="secondary" onClick={() => setOpen(true)}>
            {t.openDialog}
          </Button>
          <Button size="xl" variant="secondary" onClick={() => setSheetOpen(true)}>
            {t.openDialog}
          </Button>
          <Button size="xl" variant="secondary" onClick={() => toast(t.toastText)}>
            {t.showToast}
          </Button>
        </div>
        <Dialog open={open} title={t.cardTitle} onClose={() => setOpen(false)}>
          <p className="text-fg-muted">{t.dialogText}</p>
          <div className="mt-6 flex justify-end">
            <Button size="xl" variant="secondary" onClick={() => setOpen(false)}>
              {bg.family.cancel}
            </Button>
          </div>
        </Dialog>
        <Sheet open={sheetOpen} title={t.cardTitle} onClose={() => setSheetOpen(false)}>
          <p className="text-fg-muted">{t.dialogText}</p>
          <div className="mt-6 flex justify-end">
            <Button size="xl" variant="secondary" onClick={() => setSheetOpen(false)}>
              {bg.family.cancel}
            </Button>
          </div>
        </Sheet>
      </Block>

      <Block title={t.sectionVerdict}>
        <RiskMeter score={72} level="red" label={bg.landing.demo.riskLabel} />
        <Verdict level="red" lead={bg.protectedCheck.hangUp} reasons={[bg.engine.reasons.money]} />
        <Verdict level="yellow" />
        <Verdict level="green" />
      </Block>

      <Block title={t.sectionNew}>
        <DynamicIsland label={t.islandLabel} status="caution" size="lg">
          <p className="text-fg-muted">{t.islandText}</p>
        </DynamicIsland>
        <AvatarStack
          label={t.avatarLabel}
          people={[
            { id: "1", name: SAMPLE.protectedName },
            { id: "2", name: SAMPLE.familyName },
          ]}
        />
      </Block>

      <Block title={t.sectionLoading}>
        <SkeletonCard />
        <SkeletonList rows={2} />
        <SkeletonMeter />
        <EmptyState text={bg.family.historyEmpty} />
        <ErrorState text={bg.family.networkError} />
      </Block>
    </section>
  );
}

export default function UiPage() {
  const [haloState, setHaloState] = useState<HaloState>("idle");
  return (
    <main className="py-6 md:py-10">
      <Stage
        className="mb-10 min-h-[32rem] md:min-h-[36rem]"
        data-testid="halo-hero"
        field={<HaloFieldLazy state={haloState} focus={{ x: 0.8, y: 0.5 }} />}
      >
        <header className="shell max-w-[60ch] py-14 md:py-20">
          <p className="eyebrow">{bg.app.name}</p>
          <h1 className="mt-3 text-h1">{t.title}</h1>
          <p className="mt-4 text-lg text-fg-muted">{t.description}</p>
          <div className="mt-10">
            <Segmented
              label={t.haloStateLabel}
              hideGroupLabel={false}
              value={haloState}
              onChange={setHaloState}
              options={HALO_STATES}
              className="flex-wrap"
            />
            <p className="mt-3 max-w-[48ch] text-sm text-fg-muted">{t.haloHint}</p>
          </div>
        </header>
      </Stage>
      <div className="shell grid gap-6 xl:grid-cols-2">
        <Samples theme="light" haloState={haloState} />
        <Samples theme="dark" haloState={haloState} />
      </div>
    </main>
  );
}
