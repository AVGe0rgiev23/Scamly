// The signal line: Scamly's own motif. A thin trace that is jagged while a call
// looks like a scam and settles into a steady line when nothing is wrong.
//
//   state "alert"   → full jagged trace, danger red
//   state "caution" → half-height trace, amber
//   state "calm"    → almost flat, green
//   state "idle"    → flat line in the current text colour (dividers, empty states)
//
// How it moves: the same jagged path is squeezed with scaleY (a transform), and the
// coloured copies cross-fade with opacity. Nothing else is animated (globals.css,
// .signal-trace / .signal-layer). It is decoration: screen readers skip it, the
// words next to it carry the meaning.

import { cn } from "./cn";

export type SignalState = "alert" | "caution" | "calm" | "idle";

const WIDTH = 400;
const MID = 20;

// A small random-number function that always gives the same numbers for the same
// seed (like Python's random.Random(seed)), so the server and the browser draw the
// same line.
function seeded(seed: number): () => number {
  let value = seed;
  return () => {
    value = (value * 1664525 + 1013904223) % 4294967296;
    return value / 4294967296;
  };
}

// The jagged trace: quiet stretches broken by bursts of sharp spikes.
function buildTrace(): string {
  const random = seeded(7);
  const steps = 80;
  let path = `M0 ${MID}`;
  for (let index = 1; index < steps; index += 1) {
    const x = (index / steps) * WIDTH;
    // Two bursts, around 30 % and 70 % of the width.
    const burst =
      Math.exp(-(((index - steps * 0.3) / 7) ** 2)) + Math.exp(-(((index - steps * 0.72) / 9) ** 2));
    const noise = (random() - 0.5) * 2;
    const y = MID + noise * (2 + burst * 16);
    path += ` L${x.toFixed(1)} ${y.toFixed(1)}`;
  }
  return `${path} L${WIDTH} ${MID}`;
}

const TRACE = buildTrace();

// How tall the trace is in each state (1 = full height).
const SCALE: Record<SignalState, number> = { alert: 1, caution: 0.5, calm: 0.1, idle: 0 };

const LAYERS: { state: SignalState; className: string }[] = [
  { state: "alert", className: "stroke-danger-solid" },
  { state: "caution", className: "stroke-caution-solid" },
  { state: "calm", className: "stroke-safe-solid" },
  { state: "idle", className: "stroke-current" },
];

type SignalLineProps = {
  state: SignalState;
  className?: string;
  // Line thickness in pixels (it does not grow when the drawing is stretched).
  weight?: number;
};

export function SignalLine({ state, className, weight = 1.5 }: SignalLineProps) {
  return (
    <svg
      viewBox={`0 0 ${WIDTH} ${MID * 2}`}
      preserveAspectRatio="none"
      className={cn("block h-10 w-full overflow-visible", className)}
      fill="none"
      aria-hidden="true"
      data-signal={state}
    >
      <g className="signal-trace" style={{ transform: `scaleY(${Math.max(SCALE[state], 0.001)})` }}>
        {LAYERS.map((layer) => (
          <path
            key={layer.state}
            d={TRACE}
            className={cn("signal-layer", layer.className)}
            style={{ opacity: layer.state === state ? 1 : 0 }}
            strokeWidth={weight}
            strokeLinejoin="round"
            strokeLinecap="round"
            vectorEffect="non-scaling-stroke"
          />
        ))}
      </g>
    </svg>
  );
}

// Which signal state belongs to a verdict level of the engine.
export function signalForLevel(level: "red" | "yellow" | "green"): SignalState {
  if (level === "red") return "alert";
  if (level === "yellow") return "caution";
  return "calm";
}
