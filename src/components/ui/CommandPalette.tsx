// CommandPalette: the ⌘K / Ctrl K window for quick jumps (used by the moderator
// and admin areas in a later phase). A search field and a list of commands under it;
// typing filters the list, the arrow keys move the highlight, Enter runs it, Esc
// closes the window.
//
// Accessibility: the field is a combobox that controls a listbox; the highlighted
// command is announced with aria-activedescendant, so the focus stays in the field
// (the WAI-ARIA combobox pattern). The window is the native <dialog> of Dialog.tsx.
"use client";

import { Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { bg } from "@/i18n/bg";
import { cn } from "./cn";
import { Kbd } from "./Kbd";

// One command: either a link (href) or an action (onSelect). Like a Python dataclass.
export type Command = {
  id: string;
  label: string;
  hint?: string;
  icon?: ReactNode;
  href?: string;
  onSelect?: () => void;
};

type CommandPaletteProps = {
  commands: Command[];
  // Controlled from outside (e.g. a header button), or left to ⌘K / Ctrl K.
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  className?: string;
};

// Lower-case, without stress marks, so „Сигнали“ matches „сиг“.
function normalise(text: string): string {
  return text.toLocaleLowerCase("bg").normalize("NFD").replace(/\p{M}/gu, "");
}

export function CommandPalette({
  commands,
  open: openProp,
  onOpenChange,
  className,
}: CommandPaletteProps) {
  const router = useRouter();
  const dialog = useRef<HTMLDialogElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const listId = useId();
  const titleId = useId();
  const [ownOpen, setOwnOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const open = openProp ?? ownOpen;

  function setOpen(next: boolean) {
    setOwnOpen(next);
    onOpenChange?.(next);
    if (next) {
      setQuery("");
      setActive(0);
    }
  }

  // The latest open value and setter for the keyboard listener below (it is added
  // once, so it reads them through a ref instead of a stale copy).
  const toggleRef = useRef<() => void>(() => {});
  useEffect(() => {
    toggleRef.current = () => setOpen(!open);
  });

  // ⌘K on a Mac, Ctrl K elsewhere, from anywhere on the page.
  useEffect(() => {
    function onKey(event: globalThis.KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        toggleRef.current();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // The `open` value decides; showModal() and close() are the browser's own calls.
  useEffect(() => {
    const element = dialog.current;
    if (element === null) return;
    if (open && !element.open) {
      element.showModal();
      input.current?.focus();
    } else if (!open && element.open) {
      element.close();
    }
  }, [open]);

  const needle = normalise(query.trim());
  const shown = commands.filter((command) => normalise(command.label).includes(needle));
  const highlighted = Math.min(active, Math.max(shown.length - 1, 0));

  function run(command: Command | undefined) {
    if (command === undefined) return;
    setOpen(false);
    if (command.href !== undefined) router.push(command.href);
    command.onSelect?.();
  }

  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActive((highlighted + 1) % Math.max(shown.length, 1));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActive((highlighted - 1 + shown.length) % Math.max(shown.length, 1));
    } else if (event.key === "Enter") {
      event.preventDefault();
      run(shown[highlighted]);
    }
  }

  const optionId = (index: number) => `${listId}-${index}`;
  return (
    <dialog
      ref={dialog}
      aria-labelledby={titleId}
      className={cn(
        "dialog surface-raised mx-auto mt-[12vh] mb-auto w-[min(40rem,calc(100vw-2rem))] overflow-hidden rounded-xl bg-elevated p-0 text-fg shadow-overlay",
        className,
      )}
      onCancel={(event) => {
        event.preventDefault();
        setOpen(false);
      }}
    >
      <h2 id={titleId} className="sr-only">
        {bg.commandPalette.title}
      </h2>
      <div className="flex items-center gap-3 border-b border-line px-5">
        <Search className="size-5 shrink-0 text-fg-muted" aria-hidden="true" />
        <input
          ref={input}
          type="text"
          role="combobox"
          aria-expanded="true"
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={shown.length > 0 ? optionId(highlighted) : undefined}
          aria-label={bg.commandPalette.placeholder}
          placeholder={bg.commandPalette.placeholder}
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setActive(0);
          }}
          onKeyDown={onKeyDown}
          className="min-h-16 flex-1 bg-transparent text-lg text-fg placeholder:text-fg-subtle focus-visible:outline-none"
        />
        <Kbd>Esc</Kbd>
      </div>
      <ul
        id={listId}
        role="listbox"
        aria-label={bg.commandPalette.title}
        className="max-h-[50vh] overflow-y-auto p-2"
      >
        {shown.length === 0 ? (
          <li role="presentation" className="px-4 py-6 text-center text-fg-muted">
            {bg.commandPalette.empty}
          </li>
        ) : (
          shown.map((command, index) => (
            <li
              key={command.id}
              id={optionId(index)}
              role="option"
              aria-selected={index === highlighted}
              onPointerMove={() => setActive(index)}
              onClick={() => run(command)}
              className={cn(
                "flex min-h-12 cursor-pointer items-center gap-3 rounded-md px-4 py-2",
                index === highlighted ? "segmented-thumb text-fg" : "text-fg-muted",
              )}
            >
              {command.icon === undefined ? null : (
                <span aria-hidden="true" className="[&>svg]:size-5">
                  {command.icon}
                </span>
              )}
              <span className="flex-1">{command.label}</span>
              {command.hint === undefined ? null : (
                <span className="text-sm text-fg-subtle">{command.hint}</span>
              )}
            </li>
          ))
        )}
      </ul>
      <p className="flex items-center gap-2 border-t border-line px-5 py-3 text-xs text-fg-muted">
        <Kbd>↑</Kbd>
        <Kbd>↓</Kbd>
        {bg.commandPalette.moveHint}
        <Kbd className="ml-3">Enter</Kbd>
        {bg.commandPalette.openHint}
      </p>
    </dialog>
  );
}
