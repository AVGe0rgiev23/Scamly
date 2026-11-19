// The still halo mark: concentric rings drawn with the halo gradient (globals.css
// .halo-mark). Used by the logo and as the quiet picture of empty and error states,
// until the animated HaloRings take that slot. Decoration only (aria-hidden).

import { cn } from "./cn";

type HaloMarkProps = {
  size?: number; // in px
  // "calm" for empty states; "alert" tints the inner ring with the danger colour.
  tone?: "calm" | "alert";
  className?: string;
};

export function HaloMark({ size = 56, tone = "calm", className }: HaloMarkProps) {
  return (
    <span
      aria-hidden="true"
      className={cn("relative inline-grid shrink-0 place-items-center", className)}
      style={{ width: size, height: size }}
    >
      <span className="halo-mark absolute inset-0 opacity-90" />
      <span className="halo-mark absolute inset-[22%] opacity-60" />
      <span
        className={cn(
          "absolute inset-[42%] rounded-full",
          tone === "alert" ? "bg-danger-solid" : "bg-fg",
        )}
      />
    </span>
  );
}
