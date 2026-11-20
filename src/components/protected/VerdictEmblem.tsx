// The picture at the top of the verdict: the halo, changed by the verdict. Plain SVG
// circles and paths; all the movement is CSS (protected.css .check-emblem-*), so it
// costs no JavaScript and stops with reduced motion.
//
//   red:    one ring closes in from wide to tight, a single shockwave leaves it, and a
//           shield with „!“ appears inside: the halo becomes a shield.
//   yellow: three uneven, broken amber rings that waver, around a warning triangle.
//   green:  two calm mint rings that breathe slowly, around a tick.
//
// Decoration only (aria-hidden): the verdict is always said in words in the heading.

import type { RiskLevel } from "@/engine";

export function VerdictEmblem({ level }: { level: RiskLevel }) {
  return (
    <span className="check-emblem" data-level={level} aria-hidden="true">
      <svg viewBox="-60 -60 120 120" focusable="false">
        <circle className="check-emblem-glow" r="38" />
        {level === "red" ? (
          <>
            <circle className="check-emblem-wave" r="44" />
            <circle className="check-emblem-ring" r="44" />
            <g className="check-emblem-glyph">
              <path
                className="check-emblem-shield"
                d="M0 -27 L21 -18.5 V-3 C21 11 12 21.5 0 27 C-12 21.5 -21 11 -21 -3 V-18.5 Z"
              />
              <path className="check-emblem-mark" d="M0 -13 V3" />
              <circle className="check-emblem-dot" cy="11" r="3" />
            </g>
          </>
        ) : null}
        {level === "yellow" ? (
          <>
            <circle className="check-emblem-arc" r="33" strokeWidth="3.5" />
            <circle
              className="check-emblem-arc"
              r="43"
              strokeWidth="2.25"
              strokeDasharray="34 9 18 7 52 12"
            />
            <circle
              className="check-emblem-arc"
              r="53"
              strokeWidth="1.5"
              strokeDasharray="12 8 44 14 20 10"
            />
            <g className="check-emblem-glyph">
              <path className="check-emblem-triangle" d="M0 -19 L19 14 H-19 Z" />
              <path className="check-emblem-mark" d="M0 -6 V3" />
              <circle className="check-emblem-dot" cy="8.5" r="2.2" />
            </g>
          </>
        ) : null}
        {level === "green" ? (
          <>
            <circle className="check-emblem-arc" r="34" strokeWidth="3" />
            <circle className="check-emblem-arc" r="48" strokeWidth="1.5" />
            <g className="check-emblem-glyph">
              <path className="check-emblem-tick" d="M-12 0 L-4 8 L13 -9" />
            </g>
          </>
        ) : null}
      </svg>
    </span>
  );
}
