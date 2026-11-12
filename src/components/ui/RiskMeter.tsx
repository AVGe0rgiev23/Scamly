// The risk meter: a ruler from 0 to 100 with the engine's two limits marked
// (30 = suspicious, 60 = scam, from RISK_THRESHOLDS) and a pointer at the score.
// The pointer moves with a transform. The level is also written in words by the
// component that uses the meter; the meter itself is read aloud as "risk N of 100".

import { RISK_THRESHOLDS, type RiskLevel } from "@/engine";
import { cn } from "./cn";

const POINTER: Record<RiskLevel, string> = {
  red: "bg-danger-solid",
  yellow: "bg-caution-solid",
  green: "bg-safe-solid",
};

type RiskMeterProps = {
  score: number; // 0–100
  level: RiskLevel;
  label: string; // e.g. „Риск“; read aloud with the number
  className?: string;
};

export function RiskMeter({ score, level, label, className }: RiskMeterProps) {
  const safeScore = Math.min(100, Math.max(0, Math.round(score)));
  return (
    <div
      className={cn("w-full", className)}
      role="meter"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={safeScore}
    >
      {/* overflow-x-clip: the moved pointer layer must not widen the page. */}
      <div className="relative h-3 overflow-x-clip">
        {/* The three zones of the ruler. */}
        <div className="absolute inset-x-0 top-1 flex h-1 gap-0.5">
          <span className="bg-safe-line" style={{ width: `${RISK_THRESHOLDS.yellow}%` }} />
          <span
            className="bg-caution-line"
            style={{ width: `${RISK_THRESHOLDS.red - RISK_THRESHOLDS.yellow}%` }}
          />
          <span className="flex-1 bg-danger-line" />
        </div>
        {/* The pointer: a full-width layer moved sideways, so only transform changes. */}
        <div
          className="absolute inset-y-0 right-0.5 left-0.5 transition-transform duration-500 ease-in-out motion-reduce:transition-none"
          style={{ transform: `translateX(${safeScore}%)` }}
        >
          <span className={cn("absolute top-0 -ml-0.5 block h-3 w-1 rounded-sm", POINTER[level])} />
        </div>
      </div>
      <div
        className="tabular mt-1.5 flex justify-between font-mono text-xs text-fg-subtle"
        aria-hidden="true"
      >
        <span>0</span>
        <span style={{ marginLeft: `${RISK_THRESHOLDS.yellow - 50}%` }}>
          {RISK_THRESHOLDS.yellow}
        </span>
        <span>{RISK_THRESHOLDS.red}</span>
        <span>100</span>
      </div>
    </div>
  );
}
