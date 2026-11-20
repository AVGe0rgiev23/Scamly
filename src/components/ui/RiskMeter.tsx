// The risk gauge: a half ring from 0 to 100. Its track is the halo, faint; the part
// up to the score is drawn in the verdict's colour, and the engine's two limits are
// marked on it (30 = suspicious, 60 = scam, from RISK_THRESHOLDS). A needle turns to
// the score (a CSS transform, globals.css .risk-needle) and the number sits in the
// middle. The level is also written in words by the component that uses the gauge;
// the gauge itself is read aloud as "risk N of 100".

import { RISK_THRESHOLDS, type RiskLevel } from "@/engine";
import type { CSSProperties } from "react";
import { useId } from "react";
import { cn } from "./cn";
import { NumberTicker } from "./NumberTicker";

const VALUE_STROKE: Record<RiskLevel, string> = {
  red: "stroke-danger-solid",
  yellow: "stroke-caution-solid",
  green: "stroke-safe-solid",
};
const NEEDLE_FILL: Record<RiskLevel, string> = {
  red: "fill-danger-solid",
  yellow: "fill-caution-solid",
  green: "fill-safe-solid",
};

// The gauge's geometry in its own drawing (about 200 × 120): centre and radius.
const CX = 100;
const CY = 100;
const R = 84;
// The half ring from the left end (score 0) over the top to the right end (100).
const ARC = `M${CX - R} ${CY} A${R} ${R} 0 0 1 ${CX + R} ${CY}`;

// The point on the ring for a score, for the limit marks.
function pointFor(score: number, radius: number): { x: number; y: number } {
  const angle = Math.PI - (score / 100) * Math.PI;
  return { x: CX + radius * Math.cos(angle), y: CY - radius * Math.sin(angle) };
}

type RiskMeterProps = {
  score: number; // 0–100
  level: RiskLevel;
  label: string; // e.g. „Риск“; read aloud with the number
  // false: no number in the middle (when the page shows it elsewhere).
  showValue?: boolean;
  className?: string;
};

export function RiskMeter({ score, level, label, showValue = true, className }: RiskMeterProps) {
  const gradientId = useId();
  const safeScore = Math.min(100, Math.max(0, Math.round(score)));
  // The needle's turn, from -90° (score 0) to +90° (score 100), as a CSS variable.
  const needleStyle = { "--risk-angle": `${safeScore * 1.8 - 90}deg` } as CSSProperties;
  return (
    <div
      className={cn("relative mx-auto w-full max-w-80", className)}
      role="meter"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={safeScore}
    >
      <svg viewBox="-12 -12 224 132" className="block w-full overflow-visible" aria-hidden="true">
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="var(--halo-1)" />
            <stop offset="50%" stopColor="var(--halo-2)" />
            <stop offset="100%" stopColor="var(--halo-3)" />
          </linearGradient>
        </defs>
        {/* The track: the halo, faint. */}
        <path
          d={ARC}
          fill="none"
          stroke={`url(#${gradientId})`}
          strokeOpacity={0.3}
          strokeWidth={12}
          strokeLinecap="round"
        />
        {/* The part up to the score, in the verdict's colour. */}
        <path
          d={ARC}
          fill="none"
          className={VALUE_STROKE[level]}
          strokeWidth={12}
          strokeLinecap="round"
          pathLength={100}
          strokeDasharray={`${Math.max(safeScore, 0.01)} 100`}
        />
        {/* The two limits of the engine, as short marks across the ring. */}
        {[RISK_THRESHOLDS.yellow, RISK_THRESHOLDS.red].map((limit) => {
          const inner = pointFor(limit, R - 11);
          const outer = pointFor(limit, R + 11);
          return (
            <line
              key={limit}
              x1={inner.x}
              y1={inner.y}
              x2={outer.x}
              y2={outer.y}
              stroke="var(--text-subtle)"
              strokeWidth={1.5}
              strokeLinecap="round"
            />
          );
        })}
        {/* The numbers at the ends and at the two limits. */}
        {[0, RISK_THRESHOLDS.yellow, RISK_THRESHOLDS.red, 100].map((mark) => {
          const at = pointFor(mark, R + 22);
          return (
            <text
              key={mark}
              x={at.x}
              y={mark === 0 || mark === 100 ? CY + 14 : at.y}
              textAnchor="middle"
              dominantBaseline="middle"
              className="fill-fg-subtle font-mono text-[9px]"
            >
              {mark}
            </text>
          );
        })}
        {/* The needle: a thin wedge from the centre, turned with a transform. */}
        <g className="risk-needle" style={needleStyle}>
          <path
            d={`M${CX - 3} ${CY} L${CX} ${CY - R + 18} L${CX + 3} ${CY} Z`}
            className={NEEDLE_FILL[level]}
          />
          <circle cx={CX} cy={CY} r={6} className={NEEDLE_FILL[level]} />
          <circle cx={CX} cy={CY} r={2.5} fill="var(--bg)" />
        </g>
      </svg>
      {showValue ? (
        <p
          aria-hidden="true"
          className="-mt-1 text-center font-mono text-h2 leading-none font-semibold text-fg"
        >
          <NumberTicker value={safeScore} />
        </p>
      ) : null}
    </div>
  );
}
