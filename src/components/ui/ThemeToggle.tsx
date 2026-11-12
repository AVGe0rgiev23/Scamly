// The theme switch in the header: three small picture buttons (device, light, dark).
// Native radio buttons, so the arrow keys move between them. The choice is saved in
// the browser (localStorage) and put on <html data-theme="…">; globals.css picks the
// colours from that attribute. A tiny script in the root layout applies the saved
// choice before the first paint, so the page never flashes in the wrong theme.
"use client";

import { Monitor, Moon, Sun } from "lucide-react";
import { useEffect, useId, useRef } from "react";
import { bg } from "@/i18n/bg";

type Theme = "system" | "light" | "dark";

export const THEME_STORAGE_KEY = "scamly-theme";

const OPTIONS: { value: Theme; label: string; Icon: typeof Sun }[] = [
  { value: "system", label: bg.theme.system, Icon: Monitor },
  { value: "light", label: bg.theme.light, Icon: Sun },
  { value: "dark", label: bg.theme.dark, Icon: Moon },
];

function changeTheme(value: Theme) {
  document.documentElement.dataset.theme = value;
  try {
    localStorage.setItem(THEME_STORAGE_KEY, value);
  } catch {
    // Private browsing may block storage: the theme still changes for this page.
  }
}

export function ThemeToggle() {
  const name = useId();
  const labelId = useId();
  const group = useRef<HTMLDivElement>(null);

  // After the page loads: tick the radio of the saved theme, and listen for changes.
  useEffect(() => {
    const radios = group.current;
    if (!radios) return;
    try {
      const saved = localStorage.getItem(THEME_STORAGE_KEY);
      if (saved === "light" || saved === "dark" || saved === "system") {
        document.documentElement.dataset.theme = saved;
        const input = radios.querySelector<HTMLInputElement>(`input[value="${saved}"]`);
        if (input) input.checked = true;
      }
    } catch {
      // No storage: stay on "system".
    }
    function onChange(event: Event) {
      const input = event.target as HTMLInputElement;
      changeTheme(input.value as Theme);
    }
    radios.addEventListener("change", onChange);
    return () => radios.removeEventListener("change", onChange);
  }, []);

  return (
    <div className="flex shrink-0 items-center">
      <span id={labelId} className="sr-only">
        {bg.theme.label}
      </span>
      <div
        role="radiogroup"
        aria-labelledby={labelId}
        ref={group}
        className="flex rounded-md border border-line bg-surface-1 p-0.5"
      >
        {OPTIONS.map(({ value, label, Icon }) => (
          <label
            key={value}
            title={label}
            className="relative flex size-11 cursor-pointer items-center justify-center rounded-sm text-fg-subtle hover:text-fg has-checked:bg-surface-3 has-checked:text-fg has-focus-visible:outline-2 has-focus-visible:outline-ring"
          >
            <input
              type="radio"
              name={name}
              value={value}
              defaultChecked={value === "system"}
              className="absolute inset-0 size-full cursor-pointer opacity-0"
            />
            <Icon className="size-5" aria-hidden="true" />
            <span className="sr-only">{label}</span>
          </label>
        ))}
      </div>
    </div>
  );
}
