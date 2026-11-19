// Shared motion settings for the few client islands that use the `motion` library
// (motion.dev, MIT). A spring has no fixed duration: it moves like a weight on a
// rubber band, so "stiffness" is how hard the band pulls and "damping" how quickly
// it calms down. Two springs are enough for the whole app:
//   SPRING_UI    quick and firm, for small parts (tab pill, switch thumb, island);
//   SPRING_LARGE slow and soft, for big surfaces (a card that grows, a verdict).
// The objects are plain constants, like a Python dict defined at module level.

export const SPRING_UI = { type: "spring", stiffness: 380, damping: 30 } as const;
export const SPRING_LARGE = { type: "spring", stiffness: 120, damping: 20 } as const;

// What a moving part does instead when the person asked for less motion
// (prefers-reduced-motion): a short fade-length change, no bounce.
export const REDUCED = { duration: 0.15, ease: "linear" } as const;

// Picks the spring, or the reduced transition when `reduce` is true. Used together
// with motion's useReducedMotion() hook.
export function springOrReduced(spring: typeof SPRING_UI | typeof SPRING_LARGE, reduce: boolean) {
  return reduce ? REDUCED : spring;
}
