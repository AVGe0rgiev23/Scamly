// Compact theme switch in the site header: three small picture buttons for
// „Според устройството“, light and dark (a "segmented control").
// Remembers the chosen theme; system mode continues following the device setting.
"use client";

import { useEffect, useId, useRef } from "react";
import { bg } from "@/i18n/bg";

type Theme = "system" | "light" | "dark";

// The three choices, in the order they are shown. Each label is read aloud by screen
// readers and shown as a tooltip; on screen there is only the small picture.
const OPTIONS: { value: Theme; label: string }[] = [
  { value: "system", label: bg.theme.system },
  { value: "light", label: bg.theme.light },
  { value: "dark", label: bg.theme.dark },
];

// Our own small line pictures (inline SVG, no image files): a screen for "device",
// a sun for light and a moon for dark. They take the text colour (currentColor).
function ThemeIcon({ theme }: { theme: Theme }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="22"
      height="22"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {theme === "system" ? (
        <>
          <rect x="3" y="4" width="18" height="12" rx="2" />
          <path d="M8 20h8M12 16v4" />
        </>
      ) : null}
      {theme === "light" ? (
        <>
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
        </>
      ) : null}
      {theme === "dark" ? <path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z" /> : null}
    </svg>
  );
}

// Applies and remembers a choice. Only called after a click, never while the page renders.
function changeTheme(value: Theme) {
  document.documentElement.dataset.theme = value;
  try {
    localStorage.setItem("scamly-theme", value);
  } catch {
    // Keep the current choice usable even when it cannot be remembered.
  }
}

export function ThemeToggle() {
  // useId gives unique ids for the radio group's name and its label.
  const name = useId();
  const labelId = useId();
  const group = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const radios = group.current;
    if (!radios) return;
    try {
      const saved = localStorage.getItem("scamly-theme");
      if (saved === "light" || saved === "dark" || saved === "system") {
        document.documentElement.dataset.theme = saved;
        // Tick the saved choice after hydration (the page HTML always starts on "system").
        const input = radios.querySelector<HTMLInputElement>(`input[value="${saved}"]`);
        if (input) input.checked = true;
      }
    } catch {
      // The system theme still works when browser storage is unavailable.
    }
    // We listen to the browser's own "change" event (like registering a Python callback).
    // React's onChange would miss a click here: it doesn't know that we ticked the saved
    // choice above, so it would think the other radio button was still selected.
    function onChange(event: Event) {
      const input = event.target as HTMLInputElement;
      changeTheme(input.value as Theme);
    }
    radios.addEventListener("change", onChange);
    // Clean-up when the component disappears, so the listener is not added twice.
    return () => radios.removeEventListener("change", onChange);
  }, []);

  return (
    <div className="theme-control">
      {/* On a phone this label is hidden on screen (but still read aloud) to save space. */}
      <span id={labelId} className="theme-label">
        {bg.theme.label}
      </span>
      {/* Native radio buttons: arrow keys move between the choices, like in BigChoice. */}
      <div role="radiogroup" aria-labelledby={labelId} className="theme-options" ref={group}>
        {OPTIONS.map((option) => (
          <label key={option.value} className="theme-option" title={option.label}>
            <input
              type="radio"
              name={name}
              value={option.value}
              defaultChecked={option.value === "system"}
            />
            <ThemeIcon theme={option.value} />
            <span className="sr-only">{option.label}</span>
          </label>
        ))}
      </div>
    </div>
  );
}
