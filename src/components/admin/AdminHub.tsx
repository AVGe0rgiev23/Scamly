// The admin's panel (/admin, W3-06): three tabs, „Потребители“, „Статистика“ and
// „Дневник“. Only the open tab is shown, and it loads its own data from /api/admin/*.
//
// The tabs follow the WAI-ARIA "tabs" pattern: a role="tablist" with role="tab"
// buttons; ← and → (and Home / End) move between them, and only the selected tab is
// in the Tab order, so a keyboard user reaches the panel with one more Tab.
"use client";

import { useRef, useState, type KeyboardEvent } from "react";
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
  const buttons = useRef<(HTMLButtonElement | null)[]>([]);

  // Arrow keys move the selection (and the focus) to the next / previous tab.
  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const index = TABS.findIndex((tab) => tab.id === selected);
    let next = index;
    if (event.key === "ArrowRight") next = (index + 1) % TABS.length;
    else if (event.key === "ArrowLeft") next = (index - 1 + TABS.length) % TABS.length;
    else if (event.key === "Home") next = 0;
    else if (event.key === "End") next = TABS.length - 1;
    else return;
    event.preventDefault();
    const tab = TABS[next];
    if (tab !== undefined) {
      setSelected(tab.id);
      buttons.current[next]?.focus();
    }
  }

  return (
    <>
      <header className="family-heading">
        <h1>{bg.admin.hubTitle}</h1>
        <p className="muted">{bg.admin.hubIntro}</p>
      </header>
      <div
        role="tablist"
        aria-label={bg.admin.tabsLabel}
        className="admin-tabs"
        onKeyDown={onKeyDown}
      >
        {TABS.map((tab, index) => (
          <button
            key={tab.id}
            ref={(element) => {
              buttons.current[index] = element;
            }}
            type="button"
            role="tab"
            id={`admin-tab-${tab.id}`}
            aria-controls={`admin-panel-${tab.id}`}
            aria-selected={selected === tab.id}
            tabIndex={selected === tab.id ? 0 : -1}
            className="admin-tab"
            onClick={() => setSelected(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <section
        role="tabpanel"
        id={`admin-panel-${selected}`}
        aria-labelledby={`admin-tab-${selected}`}
        className="admin-panel"
      >
        {selected === "users" ? <UsersPanel /> : null}
        {selected === "stats" ? <StatsPanel /> : null}
        {selected === "audit" ? <AuditPanel /> : null}
      </section>
    </>
  );
}
