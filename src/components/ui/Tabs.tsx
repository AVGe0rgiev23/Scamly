// Tabs: a row of buttons that switch the panel below (role="tablist"). The arrow
// keys move between the tabs, as screen-reader users expect.
//
// The row is a glass pill; the active tab sits on a raised pill that slides from
// the old tab to the new one with a quick spring (motion's shared layout: the same
// `layoutId` on the pill in every tab, so motion animates it from one place to the
// other with a transform). With reduced motion the pill simply jumps.
"use client";

import { motion, useReducedMotion } from "motion/react";
import { useId, useRef, type KeyboardEvent, type ReactNode } from "react";
import { cn } from "./cn";
import { SPRING_UI } from "./motion";

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
  // One id per Tabs on the page, so two tab rows never share their sliding pill.
  const pillId = useId();
  const reduce = useReducedMotion() ?? false;

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
      className={cn(
        "glass flex max-w-full gap-1 self-start overflow-x-auto rounded-full p-1 [scrollbar-width:none]",
        className,
      )}
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
              "relative inline-flex min-h-11 shrink-0 cursor-pointer items-center gap-2 rounded-full px-4 text-base whitespace-nowrap",
              "transition-colors duration-150",
              selected ? "font-semibold text-fg" : "text-fg-muted hover:text-fg",
            )}
          >
            {selected ? (
              <motion.span
                layoutId={pillId}
                aria-hidden="true"
                className="segmented-thumb absolute inset-0 rounded-full"
                // The CSS transition of .segmented-thumb is for Segmented; here motion moves it.
                style={{ transition: "none" }}
                transition={reduce ? { duration: 0 } : SPRING_UI}
              />
            ) : null}
            <span className="relative">{tab.label}</span>
            {tab.count === undefined || tab.count === null ? null : (
              <span className="tabular relative rounded-full bg-glass-2 px-2 font-mono text-xs leading-5 text-fg-muted">
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
