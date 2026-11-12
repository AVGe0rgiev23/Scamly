// /dev/ui: the component gallery of the design system "Signal". Every primitive of
// src/components/ui in its states, once in the light and once in the dark theme side
// by side (a data-theme attribute on each half switches its colours). Used by the
// browser tests (tests/e2e/ui.spec.ts) and to review the design.
"use client";

import { useState } from "react";
import { Badge, StatusPill } from "@/components/ui/Badge";
import { BigChoice } from "@/components/ui/BigChoice";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Dialog } from "@/components/ui/Dialog";
import { Field, Input, Select } from "@/components/ui/Field";
import { Kbd } from "@/components/ui/Kbd";
import { Notice } from "@/components/ui/Notice";
import { RiskMeter } from "@/components/ui/RiskMeter";
import { SignalLine } from "@/components/ui/SignalLine";
import { SkeletonCard, SkeletonList } from "@/components/ui/Skeleton";
import { EmptyState, ErrorState } from "@/components/ui/States";
import { TabPanel, Tabs } from "@/components/ui/Tabs";
import { toast } from "@/components/ui/Toast";
import { Checkbox, Switch } from "@/components/ui/Toggle";
import { Tooltip } from "@/components/ui/Tooltip";
import { Verdict } from "@/components/ui/Verdict";
import { VerdictBadge } from "@/components/ui/VerdictBadge";
import { bg } from "@/i18n/bg";
import { Info } from "lucide-react";

const t = bg.ui;

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="border-t border-line py-6">
      <h3 className="mb-4 font-sans text-sm font-semibold tracking-normal text-fg-muted">
        {title}
      </h3>
      <div className="flex flex-col gap-4">{children}</div>
    </div>
  );
}

function Samples({ theme }: { theme: "light" | "dark" }) {
  // useState remembers a value between renders, like an instance field in Python.
  const [answer, setAnswer] = useState<string | null>(null);
  const [clicked, setClicked] = useState(false);
  const [tab, setTab] = useState<"one" | "two">("one");
  const [open, setOpen] = useState(false);
  const id = (name: string) => `${theme}-${name}`;
  return (
    <section
      data-theme={theme}
      aria-label={bg.theme[theme]}
      className="min-w-0 rounded-lg border border-line bg-canvas p-5 text-fg md:p-8"
    >
      <h2 className="text-h2">{bg.theme[theme]}</h2>
      <p className="mt-2 text-fg-muted">{t.typeSample}</p>

      <Block title={t.sectionButtons}>
        <Card>
          <h3 className="text-h3">{t.cardTitle}</h3>
          <p className="mt-2 text-fg-muted">{t.cardText}</p>
          <div className="mt-5 flex flex-wrap gap-3">
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
          <Button size="xl" variant="secondary" loading>
            {bg.family.saving}
          </Button>
          <Tooltip text={t.tooltip}>
            <Button size="xl" variant="secondary" aria-label={t.tooltip}>
              <Info className="size-5" aria-hidden="true" />
            </Button>
          </Tooltip>
          <Kbd>Esc</Kbd>
        </div>
      </Block>

      <Block title={t.sectionFields}>
        <BigChoice question={t.question} value={answer} onChange={setAnswer} />
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
        <Checkbox label={t.checkboxLabel} defaultChecked />
        <Switch label={t.switchLabel} />
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
      </Block>

      <Block title={t.sectionSignal}>
        <p className="text-sm text-fg-muted">{t.signalStates}</p>
        <SignalLine state="alert" />
        <SignalLine state="caution" />
        <SignalLine state="calm" />
        <SignalLine state="idle" className="text-line-strong" />
        <RiskMeter score={72} level="red" label={bg.landing.demo.riskLabel} />
        <Verdict level="red" lead={bg.protectedCheck.hangUp} reasons={[bg.engine.reasons.money]} />
        <Verdict level="yellow" />
        <Verdict level="green" />
      </Block>

      <Block title={t.sectionLoading}>
        <SkeletonCard />
        <SkeletonList rows={2} />
        <EmptyState text={bg.family.historyEmpty} />
        <ErrorState text={bg.family.networkError} />
      </Block>
    </section>
  );
}

export default function UiPage() {
  return (
    <main className="shell py-10 md:py-16">
      <header className="mb-10 max-w-[60ch]">
        <p className="text-fg-muted">{bg.app.name}</p>
        <h1 className="text-h1">{t.title}</h1>
        <p className="mt-4 text-lg text-fg-muted">{t.description}</p>
      </header>
      <div className="grid gap-6 xl:grid-cols-2">
        <Samples theme="light" />
        <Samples theme="dark" />
      </div>
    </main>
  );
}
