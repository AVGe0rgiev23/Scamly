// The Scamly logo mark (redesign v3 „Ореол“, final): three concentric arcs that close
// into a ring around a dot. The same numbers as the master drawing
// scripts/icons/logo.svg; at 20 px and below the "small" drawing of
// scripts/icons/logo-small.svg is used (one arc and the ring, thicker), because
// three arcs blur together at that size.
//
// tone "halo": the halo gradient of the current theme (its stops read the CSS
// variables --halo-1/2/3, so the light theme gets the deeper Porcelain colours) and
// a dot in the text colour. tone "mono": everything in currentColor (print, quiet
// places). Decoration only (aria-hidden): the link around it carries the name.

import { useId } from "react";

type HaloLogoProps = {
  size?: number; // in px
  tone?: "halo" | "mono";
  className?: string;
};

// The arcs of the full mark (viewBox 32): radius, line width, how much of the circle
// is drawn (in %) and the turn of its start. A list of tuples, like in Python.
const FULL_ARCS: [number, number, number, number][] = [
  [13.6, 2.4, 54, 52.8],
  [9.6, 2.4, 77, 56.4],
  [5.6, 2.6, 100, 0],
];
// The small mark (viewBox 16).
const SMALL_ARCS: [number, number, number, number][] = [
  [7, 1.8, 72, 40.4],
  [4.5, 1.9, 100, 0],
];

export function HaloLogo({ size = 32, tone = "halo", className }: HaloLogoProps) {
  // useId gives every logo on the page its own gradient id (two logos with the same
  // id would share one gradient, and a hidden one would blank out the other).
  const gradientId = `halo-logo-${useId().replace(/:/g, "")}`;
  const small = size <= 20;
  const box = small ? 16 : 32;
  const centre = box / 2;
  const arcs = small ? SMALL_ARCS : FULL_ARCS;
  const stroke = tone === "mono" ? "currentColor" : `url(#${gradientId})`;
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      width={size}
      height={size}
      viewBox={`0 0 ${box} ${box}`}
      className={className}
      style={{ flexShrink: 0 }}
    >
      {tone === "halo" ? (
        <defs>
          <linearGradient
            id={gradientId}
            gradientUnits="userSpaceOnUse"
            x1={box * 0.12}
            y1={box * 0.88}
            x2={box * 0.88}
            y2={box * 0.12}
          >
            <stop offset="0" style={{ stopColor: "var(--halo-1)" }} />
            <stop offset="0.52" style={{ stopColor: "var(--halo-2)" }} />
            <stop offset="1" style={{ stopColor: "var(--halo-3)" }} />
          </linearGradient>
        </defs>
      ) : null}
      <g fill="none" stroke={stroke} strokeLinecap="round">
        {arcs.map(([radius, width, percent, turn]) =>
          percent === 100 ? (
            <circle key={radius} cx={centre} cy={centre} r={radius} strokeWidth={width} />
          ) : (
            <circle
              key={radius}
              cx={centre}
              cy={centre}
              r={radius}
              strokeWidth={width}
              pathLength={100}
              strokeDasharray={`${percent} ${100 - percent}`}
              transform={`rotate(${turn} ${centre} ${centre})`}
            />
          ),
        )}
      </g>
      <circle
        cx={centre}
        cy={centre}
        r={small ? 2 : 2.4}
        style={{ fill: tone === "mono" ? "currentColor" : "var(--text)" }}
      />
    </svg>
  );
}
