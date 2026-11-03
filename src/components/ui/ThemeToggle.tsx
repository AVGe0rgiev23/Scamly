// Remembers the chosen theme; system mode continues following the device setting.
"use client";

import { useEffect, useId, useRef } from "react";
import { bg } from "@/i18n/bg";

type Theme = "system" | "light" | "dark";

export function ThemeToggle() {
  const id = useId();
  const select = useRef<HTMLSelectElement>(null);
  useEffect(() => {
    try {
      const saved = localStorage.getItem("scamly-theme");
      if (saved === "light" || saved === "dark" || saved === "system") {
        document.documentElement.dataset.theme = saved;
        // Synchronise the native select with browser storage after hydration.
        if (select.current) select.current.value = saved;
      }
    } catch {
      // The system theme still works when browser storage is unavailable.
    }
  }, []);

  function changeTheme(value: Theme) {
    document.documentElement.dataset.theme = value;
    try {
      localStorage.setItem("scamly-theme", value);
    } catch {
      // Keep the current choice usable even when it cannot be remembered.
    }
  }

  return (
    <div className="theme-control">
      <label htmlFor={id}>{bg.theme.label}</label>
      <select
        id={id}
        ref={select}
        defaultValue="system"
        onChange={(event) => changeTheme(event.target.value as Theme)}
      >
        <option value="system">{bg.theme.system}</option>
        <option value="light">{bg.theme.light}</option>
        <option value="dark">{bg.theme.dark}</option>
      </select>
    </div>
  );
}
