// Skeletons: grey shapes with the size of the content that is still loading, so the
// page does not jump when the content arrives. Hidden from screen readers; the
// component that shows them also has a role="status" text („Зареждане…“).

import { cn } from "./cn";

// One block. Give it a height and width with classes, e.g. className="h-6 w-40".
export function Skeleton({ className }: { className?: string }) {
  return <span className={cn("skeleton block", className)} aria-hidden="true" />;
}

// Lines of text; the last one is shorter, like a real paragraph.
export function SkeletonText({ lines = 3, className }: { lines?: number; className?: string }) {
  return (
    <span className={cn("flex flex-col gap-2.5", className)} aria-hidden="true">
      {Array.from({ length: lines }, (_, index) => (
        <span
          key={index}
          className={cn("skeleton block h-4", index === lines - 1 ? "w-3/5" : "w-full")}
        />
      ))}
    </span>
  );
}

// A list row: a round mark, two lines and a small label on the right.
export function SkeletonRow({ className }: { className?: string }) {
  return (
    <span
      className={cn("flex items-center gap-4 border-b border-line py-4", className)}
      aria-hidden="true"
    >
      <span className="skeleton block size-10 shrink-0 rounded-full" />
      <span className="flex flex-1 flex-col gap-2">
        <span className="skeleton block h-4 w-2/5" />
        <span className="skeleton block h-3.5 w-3/5" />
      </span>
      <span className="skeleton block h-6 w-20" />
    </span>
  );
}

// Several rows under each other (people, alerts, reports, users).
export function SkeletonList({ rows = 3, className }: { rows?: number; className?: string }) {
  return (
    <span className={cn("block", className)} aria-hidden="true">
      {Array.from({ length: rows }, (_, index) => (
        <SkeletonRow key={index} />
      ))}
    </span>
  );
}

// A panel: a heading line and a paragraph.
export function SkeletonCard({ className }: { className?: string }) {
  return (
    <span
      className={cn("block rounded-lg border border-line bg-surface-1 p-6", className)}
      aria-hidden="true"
    >
      <span className="skeleton mb-4 block h-6 w-1/3" />
      <SkeletonText lines={3} />
    </span>
  );
}

// A bar chart: bars of different heights on a base line.
export function SkeletonChart({ className }: { className?: string }) {
  const heights = ["h-10", "h-20", "h-14", "h-28", "h-16", "h-24", "h-12", "h-20", "h-8", "h-16"];
  return (
    <span
      className={cn("flex h-32 items-end gap-2 border-b border-line", className)}
      aria-hidden="true"
    >
      {heights.map((height, index) => (
        <span key={index} className={cn("skeleton block flex-1 rounded-b-none", height)} />
      ))}
    </span>
  );
}

// The risk meter and the signal line while a verdict is being computed.
export function SkeletonMeter({ className }: { className?: string }) {
  return (
    <span className={cn("flex flex-col gap-3", className)} aria-hidden="true">
      <span className="skeleton block h-8 w-28" />
      <span className="skeleton block h-3 w-full" />
    </span>
  );
}
