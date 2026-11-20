// AvatarStack: a row of small overlapping round initials (e.g. the family members
// who get an alert), each with a tooltip of the full name, and „+N“ when there are
// more people than fit. Each disc has a thin halo ring and is cut out from the one
// before it by a ring of the page colour, so the overlap stays readable.
// The names are in the DOM for screen readers; the tooltips are only for the eye.

import { fill } from "@/components/family/format";
import { bg } from "@/i18n/bg";
import { cn } from "./cn";
import { Tooltip } from "./Tooltip";

export type AvatarPerson = { id: string; name: string };

// "Мария Петрова" → "МП"; one word → its first two letters.
export function initialsOf(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "?";
  if (words.length === 1) return (words[0] ?? "").slice(0, 2).toLocaleUpperCase("bg");
  return `${(words[0] ?? "").charAt(0)}${(words[words.length - 1] ?? "").charAt(0)}`.toLocaleUpperCase(
    "bg",
  );
}

type AvatarStackProps = {
  people: AvatarPerson[];
  // Read aloud before the names, e.g. „Получават сигнала“.
  label: string;
  max?: number;
  className?: string;
};

const DISC =
  "relative inline-grid size-10 shrink-0 place-items-center rounded-full bg-surface-3 text-sm font-semibold text-fg ring-[3px] ring-(--bg) shadow-highlight";

export function AvatarStack({ people, label, max = 4, className }: AvatarStackProps) {
  const shown = people.slice(0, max);
  const hidden = people.length - shown.length;
  return (
    <ul aria-label={label} className={cn("flex items-center", className)}>
      {shown.map((person, index) => (
        <li key={person.id} className={index === 0 ? "" : "-ml-2.5"}>
          <Tooltip text={person.name}>
            <span className={DISC} tabIndex={0}>
              <span
                aria-hidden="true"
                className="halo-mark absolute -inset-px opacity-80 [--halo-hole:86%]"
              />
              <span aria-hidden="true">{initialsOf(person.name)}</span>
              <span className="sr-only">{person.name}</span>
            </span>
          </Tooltip>
        </li>
      ))}
      {hidden > 0 ? (
        <li className="-ml-2.5">
          <span className={cn(DISC, "bg-glass-2 text-fg-muted")}>
            <span aria-hidden="true">+{hidden}</span>
            <span className="sr-only">{fill(bg.ui.avatarMore, { count: hidden })}</span>
          </span>
        </li>
      ) : null}
    </ul>
  );
}
