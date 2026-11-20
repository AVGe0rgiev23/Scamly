// Our own line illustrations for the home page (no stock photos, no copied art): thin
// strokes in the halo gradient on a dark or porcelain card, drawn as inline SVG so they
// cost no extra request and follow the theme through CSS variables.
//   EducationArt  a phone whose sound waves turn into a halo that reaches a family;
//   ReportArt     a shield with a raised flag (a report that protects others);
//   MapArt        Bulgaria's districts, a few of them glowing (no data, a picture).
// All are decoration (aria-hidden): the card's heading and text say what they mean.
// Server Components; `id` keeps the gradient ids unique when one is used twice.

import { DISTRICT_PATHS, OUTLINE_HEIGHT, OUTLINE_WIDTH } from "./bgOutline";

// The halo gradient as an SVG paint (the colours come from the theme's CSS variables).
function HaloPaint({ id }: { id: string }) {
  return (
    <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stopColor="var(--halo-1)" />
      <stop offset="55%" stopColor="var(--halo-2)" />
      <stop offset="100%" stopColor="var(--halo-3)" />
    </linearGradient>
  );
}

// A head-and-shoulders outline, used for the family in EducationArt.
function Person({ x, y, scale = 1 }: { x: number; y: number; scale?: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${scale})`}>
      <circle cx="0" cy="-26" r="13" />
      <path d="M-26 22c0-19 12-31 26-31s26 12 26 31" />
    </g>
  );
}

export function EducationArt({ id }: { id: string }) {
  return (
    <svg viewBox="0 0 480 300" className="landing-art" aria-hidden="true" focusable="false">
      <defs>
        <HaloPaint id={id} />
      </defs>
      <g fill="none" stroke="var(--border-strong)" strokeWidth="1.5" strokeLinecap="round">
        {/* The phone */}
        <rect x="64" y="70" width="88" height="160" rx="18" />
        <rect x="94" y="80" width="28" height="7" rx="3.5" />
        <path d="M92 200h32" />
      </g>
      {/* The sound turning into a halo: arcs that grow and close into rings. */}
      <g fill="none" stroke={`url(#${id})`} strokeLinecap="round" className="landing-art-glow">
        <path d="M176 120a40 40 0 0 1 0 60" strokeWidth="2" />
        <path d="M196 102a66 66 0 0 1 0 96" strokeWidth="2" opacity="0.8" />
        <path d="M216 86a90 90 0 0 1 0 128" strokeWidth="2" opacity="0.6" />
        <circle cx="352" cy="166" r="92" strokeWidth="1.5" opacity="0.45" />
        <circle cx="352" cy="166" r="70" strokeWidth="2" opacity="0.8" />
      </g>
      {/* The family inside the halo */}
      <g fill="none" stroke="var(--text)" strokeWidth="1.6" strokeLinecap="round" opacity="0.9">
        <Person x={322} y={188} scale={0.85} />
        <Person x={356} y={176} />
        <Person x={388} y={192} scale={0.75} />
      </g>
    </svg>
  );
}

export function ReportArt({ id }: { id: string }) {
  return (
    <svg viewBox="0 0 480 300" className="landing-art" aria-hidden="true" focusable="false">
      <defs>
        <HaloPaint id={id} />
      </defs>
      {/* Rings behind the shield */}
      <g fill="none" stroke={`url(#${id})`} className="landing-art-glow">
        <circle cx="240" cy="150" r="118" strokeWidth="1" opacity="0.35" />
        <circle cx="240" cy="150" r="96" strokeWidth="1.5" opacity="0.6" />
      </g>
      {/* The shield */}
      <path
        d="M240 64l70 26v52c0 46-30 80-70 96-40-16-70-50-70-96V90z"
        fill="color-mix(in oklab, var(--halo-2) 8%, transparent)"
        stroke={`url(#${id})`}
        strokeWidth="2.2"
        strokeLinejoin="round"
      />
      {/* The raised flag (a report) */}
      <g
        fill="none"
        stroke="var(--text)"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M222 196V108" />
        <path d="M222 112c14-8 26 6 40-2v38c-14 8-26-6-40 2" />
      </g>
    </svg>
  );
}

// The districts that glow in the picture (София-град, Пловдив, Варна). Decoration only.
const GLOWING = new Set(["BG-22", "BG-16", "BG-03"]);

export function MapArt({ id, className }: { id: string; className?: string }) {
  return (
    <svg
      viewBox={`-10 -10 ${OUTLINE_WIDTH + 20} ${OUTLINE_HEIGHT + 20}`}
      className={className ?? "landing-art landing-map"}
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <filter id={`${id}-blur`} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="9" />
        </filter>
      </defs>
      <g className="landing-map-glow" filter={`url(#${id}-blur)`}>
        {DISTRICT_PATHS.filter((district) => GLOWING.has(district.code)).map((district) => (
          <path key={district.code} d={district.d} />
        ))}
      </g>
      <g className="landing-map-land">
        {DISTRICT_PATHS.map((district) => (
          <path
            key={district.code}
            d={district.d}
            data-glow={GLOWING.has(district.code) ? "true" : undefined}
          />
        ))}
      </g>
    </svg>
  );
}
