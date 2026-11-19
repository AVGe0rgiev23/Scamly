// Phase 2 rebuilds this.
// The Scamly mark for now: a small halo — concentric rings of the brand gradient
// around a bright core, drawn with CSS (HaloMark), so it follows the theme. Our own
// drawing. Decoration: the link next to it carries the name.

import { HaloMark } from "@/components/ui/HaloMark";

export function LogoMark({ size = 28 }: { size?: number }) {
  return <HaloMark size={size} />;
}
