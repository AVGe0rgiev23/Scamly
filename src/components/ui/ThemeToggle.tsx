// The theme switch in the header: a small segmented pill with three picture choices
// (device, light, dark) and a thumb that slides under the chosen one.
// The choice is saved in the browser (localStorage) and put on <html data-theme="…">;
// globals.css picks the colours from that attribute. A tiny script in the root layout
// (src/config/inlineScripts.ts) applies the saved choice before the first paint, so
// the page never flashes in the wrong theme.
"use client";

import { Monitor, Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";
import { bg } from "@/i18n/bg";
import { Segmented, type SegmentOption } from "./Segmented";

type Theme = "system" | "light" | "dark";

export const THEME_STORAGE_KEY = "scamly-theme";

const OPTIONS: SegmentOption<Theme>[] = [
  { value: "system", label: bg.theme.system, icon: <Monitor />, hideLabel: true },
  { value: "light", label: bg.theme.light, icon: <Sun />, hideLabel: true },
  { value: "dark", label: bg.theme.dark, icon: <Moon />, hideLabel: true },
];

function isTheme(value: string | null): value is Theme {
  return value === "light" || value === "dark" || value === "system";
}

function saveTheme(value: Theme) {
  document.documentElement.dataset.theme = value;
  try {
    localStorage.setItem(THEME_STORAGE_KEY, value);
  } catch {
    // Private browsing may block storage: the theme still changes for this page.
  }
}

export function ThemeToggle({ className }: { className?: string }) {
  // The server cannot know the saved choice, so the first render says "system";
  // right after the page loads we read the real one (the colours are already right,
  // the head script set them).
  const [theme, setTheme] = useState<Theme>("system");

  useEffect(() => {
    let saved: string | null = null;
    try {
      saved = localStorage.getItem(THEME_STORAGE_KEY);
    } catch {
      // No storage: stay on "system".
    }
    if (isTheme(saved) && saved !== "system") {
      // Reading browser storage is a sync with the outside world, so it belongs in
      // an effect; it runs once after the first paint.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setTheme(saved);
    }
  }, []);

  return (
    <Segmented
      label={bg.theme.label}
      options={OPTIONS}
      value={theme}
      onChange={(value) => {
        setTheme(value);
        saveTheme(value);
      }}
      className={className}
    />
  );
}
