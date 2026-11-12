// The admin's panel (/admin, W3-06): three tabs, „Потребители“, „Статистика“ and
// „Дневник“. Only the open tab is shown, and it loads its own data from /api/admin/*.
//
// The tabs (ui/Tabs) follow the WAI-ARIA "tabs" pattern: a role="tablist" with
// role="tab" buttons; ← and → (and Home / End) move between them, and only the selected
// tab is in the Tab order, so a keyboard user reaches the panel with one more Tab.
"use client";

import { useState } from "react";
import { TabPanel, Tabs } from "@/components/ui/Tabs";
import { bg } from "@/i18n/bg";
import { AuditPanel } from "./AuditPanel";
import { StatsPanel } from "./StatsPanel";
import { UsersPanel } from "./UsersPanel";

const TABS = [
  { id: "users", label: bg.admin.tabUsers },
  { id: "stats", label: bg.admin.tabStats },
  { id: "audit", label: bg.admin.tabAudit },
] as const;
type TabId = (typeof TABS)[number]["id"];

export function AdminHub() {
  const [selected, setSelected] = useState<TabId>("users");

  return (
    <>
      <header className="mb-10 max-w-[60ch]">
        <h1 className="text-h1">{bg.admin.hubTitle}</h1>
        <p className="mt-4 text-lg text-fg-muted">{bg.admin.hubIntro}</p>
      </header>
      <Tabs
        label={bg.admin.tabsLabel}
        tabs={TABS.map((tab) => ({ id: tab.id, label: tab.label }))}
        value={selected}
        onChange={setSelected}
        tabId={(id) => `admin-tab-${id}`}
        panelId={(id) => `admin-panel-${id}`}
      />
      <TabPanel
        id={`admin-panel-${selected}`}
        labelledBy={`admin-tab-${selected}`}
        className="pt-8 md:pt-10"
      >
        {selected === "users" ? <UsersPanel /> : null}
        {selected === "stats" ? <StatsPanel /> : null}
        {selected === "audit" ? <AuditPanel /> : null}
      </TabPanel>
    </>
  );
}
