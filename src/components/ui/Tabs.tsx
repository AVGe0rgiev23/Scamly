// Tabs: a row of buttons that switch the panel below (role="tablist"). The arrow
// keys move between the tabs, as screen-reader users expect. The active tab has an
// accent line under it and bold text; the switch is instant (it is often done from
// the keyboard, so it is not animated).
"use client";

import { useRef, type KeyboardEvent, type ReactNode } from "react";
import { cn } from "./cn";

export type TabItem<Id extends string> = {
  id: Id;
  label: string;
  // A small number after the label, e.g. how many reports wait.
  count?: number | null;
};

type TabsProps<Id extends string> = {
  label: string; // read aloud: what the tabs are for
  tabs: TabItem<Id>[];
  value: Id;
  onChange: (id: Id) => void;
  // Builds the id of a tab button / its panel, so aria-controls can link them.
  tabId?: (id: Id) => string;
  panelId?: (id: Id) => string;
  className?: string;
};

export function Tabs<Id extends string>({
  label,
  tabs,
  value,
  onChange,
  tabId,
  panelId,
  className,
}: TabsProps<Id>) {
  const list = useRef<HTMLDivElement>(null);

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const index = tabs.findIndex((tab) => tab.id === value);
    let next = index;
    if (event.key === "ArrowRight") next = (index + 1) % tabs.length;
    else if (event.key === "ArrowLeft") next = (index - 1 + tabs.length) % tabs.length;
    else if (event.key === "Home") next = 0;
    else if (event.key === "End") next = tabs.length - 1;
    else return;
    event.preventDefault();
    const target = tabs[next];
    if (target === undefined) return;
    onChange(target.id);
    list.current?.querySelectorAll<HTMLButtonElement>('[role="tab"]')[next]?.focus();
  }

  return (
    <div
      ref={list}
      role="tablist"
      aria-label={label}
      onKeyDown={onKeyDown}
      className={cn("flex gap-1 overflow-x-auto border-b border-line", className)}
    >
      {tabs.map((tab) => {
        const selected = tab.id === value;
        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            id={tabId?.(tab.id)}
            aria-controls={panelId?.(tab.id)}
            aria-selected={selected}
            tabIndex={selected ? 0 : -1}
            onClick={() => onChange(tab.id)}
            className={cn(
              "-mb-px inline-flex min-h-12 shrink-0 cursor-pointer items-center gap-2 border-b-2 px-4 text-base",
              selected
                ? "border-accent font-semibold text-fg"
                : "border-transparent text-fg-muted hover:text-fg",
            )}
          >
            {tab.label}
            {tab.count === undefined || tab.count === null ? null : (
              <span className="tabular rounded-sm bg-surface-3 px-1.5 font-mono text-xs text-fg-muted">
                {tab.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

// The panel that belongs to a tab.
export function TabPanel({
  id,
  labelledBy,
  children,
  className,
}: {
  id?: string;
  labelledBy?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div role="tabpanel" id={id} aria-labelledby={labelledBy} tabIndex={0} className={className}>
      {children}
    </div>
  );
}
