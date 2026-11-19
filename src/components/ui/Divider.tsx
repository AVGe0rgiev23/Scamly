// A thin line between two parts of a page. With `signal` (the v2 name, kept for the
// screens) or `halo` it is drawn with the halo gradient, fading out at both ends.

import { cn } from "./cn";

type DividerProps = { signal?: boolean; halo?: boolean; className?: string };

export function Divider({ signal = false, halo = false, className }: DividerProps) {
  if (signal || halo) {
    return <hr className={cn("halo-line", className)} />;
  }
  return <hr className={cn("border-0 border-t border-line", className)} />;
}
