// The small drawings next to each answer of the call check: our own line icons
// (24 × 24, one stroke width, round ends), drawn for these answers only, so they all
// look like one family. No emoji. Decoration only: the words are always shown, and
// screen readers skip the icons (BigChoice hides the icon disc).

import type { ReactNode } from "react";
import type { ChoiceOption } from "@/components/ui/BigChoice";

// One icon frame: the same size, stroke and corners for every drawing.
function Line({ children }: { children: ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      focusable="false"
    >
      {children}
    </svg>
  );
}

// A badge with a star (the police).
const police = (
  <Line>
    <path d="M12 3l7 3v5c0 4.5-3 8-7 10-4-2-7-5.5-7-10V6z" />
    <path d="M12 8.6l1.05 2.1 2.3.33-1.67 1.62.4 2.3L12 13.87l-2.08 1.08.4-2.3-1.67-1.62 2.3-.33z" />
  </Line>
);

// Two people (a relative).
const relative = (
  <Line>
    <circle cx="9" cy="8" r="3" />
    <path d="M3.5 19.5c.6-3.3 2.9-5.2 5.5-5.2s4.9 1.9 5.5 5.2" />
    <circle cx="16.6" cy="9.4" r="2.4" />
    <path d="M15.4 14.4c2.5-.3 4.6 1.2 5.2 4.4" />
  </Line>
);

// A building with columns (bank, electricity company, health fund).
const official = (
  <Line>
    <path d="M3.5 9 12 4l8.5 5" />
    <path d="M4.5 9.5h15" />
    <path d="M7 12v4.5M10.3 12v4.5M13.7 12v4.5M17 12v4.5" />
    <path d="M4.5 19.5h15" />
  </Line>
);

// A parcel (a courier).
const courier = (
  <Line>
    <path d="M4 7.5 12 4l8 3.5v9L12 20l-8-3.5z" />
    <path d="M4 7.5 12 11l8-3.5" />
    <path d="M12 11v9" />
    <path d="m8 5.8 8 3.5" />
  </Line>
);

// A question mark in a circle (someone else / I don't know).
const question = (
  <Line>
    <circle cx="12" cy="12" r="9" />
    <path d="M9.6 9.4a2.5 2.5 0 1 1 3.5 2.3c-.7.3-1.1.9-1.1 1.6v.3" />
    <path d="M12 16.9h.01" strokeWidth={2.4} />
  </Line>
);

const yes = (
  <Line>
    <path d="M5 12.5 9.5 17 19 7.5" />
  </Line>
);

const no = (
  <Line>
    <path d="M6.5 6.5l11 11M17.5 6.5l-11 11" />
  </Line>
);

// A person with a question mark (a courier or a stranger at the door).
const stranger = (
  <Line>
    <circle cx="10" cy="8" r="3.2" />
    <path d="M4 19.5c.7-3.6 3.1-5.5 6-5.5 1.2 0 2.3.3 3.2.8" />
    <path d="M16.3 14.2a1.9 1.9 0 1 1 2.7 1.7c-.5.2-.8.6-.8 1.1v.2" />
    <path d="M18.2 19.6h.01" strokeWidth={2.4} />
  </Line>
);

// A balcony rail with an arrow going down (throw it down from the window).
const throwDown = (
  <Line>
    <path d="M4 4.5h16M4 8.5h16" />
    <path d="M7 4.5v4M12 4.5v4M17 4.5v4" />
    <path d="M12 11.5V20" />
    <path d="m8.5 16.5 3.5 3.5 3.5-3.5" />
  </Line>
);

// A bank card (a bank transfer).
const card = (
  <Line>
    <rect x="3" y="6" width="18" height="12" rx="2.5" />
    <path d="M3 10h18" />
    <path d="M6.5 14.5h4" />
  </Line>
);

// Answer value → icon. The values of different questions never collide except
// "other", which gets the same question mark everywhere.
// Record<string, ReactNode> is like a Python dict[str, ReactNode].
const ICONS: Record<string, ReactNode> = {
  police,
  relative,
  official,
  courier,
  other: question,
  yes,
  no,
  unsure: question,
  courier_or_stranger: stranger,
  throw: throwDown,
  bank_transfer: card,
};

export function withIcons(options: ChoiceOption[]): ChoiceOption[] {
  return options.map((option) => ({ ...option, icon: ICONS[option.value] }));
}
