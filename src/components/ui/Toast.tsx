// Toasts: short confirmations that rise from the bottom of the screen and leave by
// themselves („Връзката е копирана.“). Usage, from any Client Component:
//
//   import { toast } from "@/components/ui/Toast";
//   toast("Връзката е копирана.");            // or toast(text, "danger")
//
// <Toaster /> is placed once in the root layout. The list is a live region, so a
// screen reader reads each new toast. Each toast is a glass pill with its status
// icon in a small disc. Errors that need an action are NOT toasts: they stay next
// to the thing that failed (Notice, ErrorState).
"use client";

import { useSyncExternalStore } from "react";
import { StatusIcon, type Status } from "./Badge";
import { cn } from "./cn";

type ToastItem = { id: number; text: string; status: Status };

// A tiny store outside React (like a module-level list in Python) with listeners.
let items: ToastItem[] = [];
let nextId = 1;
const listeners = new Set<() => void>();
const EMPTY: ToastItem[] = [];
const LIFETIME_MS = 4500;

// The colour of the icon disc for each status.
const DISC: Record<Status, string> = {
  safe: "bg-safe-bg text-safe-fg",
  caution: "bg-caution-bg text-caution-fg",
  danger: "bg-danger-bg text-danger-fg",
  info: "bg-info-bg text-info-fg",
  neutral: "bg-glass-2 text-fg-muted",
};

function emit() {
  for (const listener of listeners) listener();
}

export function toast(text: string, status: Status = "safe") {
  const id = nextId;
  nextId += 1;
  items = [...items.slice(-2), { id, text, status }]; // at most 3 on screen
  emit();
  setTimeout(() => {
    items = items.filter((item) => item.id !== id);
    emit();
  }, LIFETIME_MS);
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function Toaster() {
  const current = useSyncExternalStore(
    subscribe,
    () => items,
    () => EMPTY,
  );
  return (
    <div
      role="status"
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 bottom-5 z-(--z-index-toast) flex flex-col items-center gap-2 px-4"
    >
      {current.map((item) => (
        <p
          key={item.id}
          className="toast glass pointer-events-auto flex max-w-md items-center gap-3 rounded-full py-2 pr-5 pl-2 text-base text-fg shadow-overlay"
        >
          <span
            className={cn(
              "inline-grid size-8 shrink-0 place-items-center rounded-full",
              DISC[item.status],
            )}
          >
            <StatusIcon status={item.status} />
          </span>
          <span>{item.text}</span>
        </p>
      ))}
    </div>
  );
}
