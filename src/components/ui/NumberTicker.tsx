// NumberTicker: a real number that counts to its new value when it changes (for
// example the risk score while the visitor edits the demo text). Only real numbers,
// never invented statistics. The digits keep a fixed width (tabular-nums), so the
// text does not wobble while counting.
//
// Screen readers get the final value at once (a hidden copy in the DOM); the
// counting copy is hidden from them. With reduced motion the number just changes.
"use client";

import { animate, useReducedMotion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { cn } from "./cn";

type NumberTickerProps = {
  value: number;
  // Where the first count starts; leave it out to show the value at once.
  from?: number;
  // Seconds for one count.
  duration?: number;
  className?: string;
};

export function NumberTicker({ value, from, duration = 0.9, className }: NumberTickerProps) {
  const reduce = useReducedMotion() ?? false;
  const [shown, setShown] = useState(from ?? value);
  // The number on screen when the next count starts (like a Python instance field).
  const current = useRef(from ?? value);

  useEffect(() => {
    if (reduce) {
      current.current = value;
      // The number must follow the prop at once; this is the "no animation" path.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setShown(value);
      return;
    }
    const controls = animate(current.current, value, {
      duration,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: (latest) => {
        current.current = latest;
        setShown(Math.round(latest));
      },
    });
    return () => controls.stop();
  }, [value, duration, reduce]);

  return (
    <span className={cn("tabular", className)}>
      <span className="sr-only">{value}</span>
      <span aria-hidden="true">{shown}</span>
    </span>
  );
}
