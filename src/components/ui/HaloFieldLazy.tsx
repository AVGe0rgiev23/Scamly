"use client";

// HaloFieldLazy: the small client island that loads the live HaloField only in the
// browser, after the page is shown. The WebGL code (HaloField + shader) becomes its own
// JavaScript chunk, so pages without a halo never download it. Until the chunk arrives
// (and on the server) the still HaloRings stand in, so the picture never pops in.
// Server Components can render this directly, e.g. <Stage field={<HaloFieldLazy … />}>.
//
// `next/dynamic` with `ssr: false` is like a Python lazy import inside a function:
// the module is fetched only when this component first runs in the browser.

import dynamic from "next/dynamic";
import type { HaloFieldProps } from "./HaloField";
import { HaloRings } from "./HaloRings";
import { DEFAULT_FOCUS } from "./halo/haloMath";

// The still stand-in while loading: the same rings HaloField uses on weak devices,
// centred on the same focus point. It cannot know the `state` prop here (next/dynamic
// passes no props to `loading`), so it shows the calm „idle“ rings.
function LoadingRings() {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
      <HaloRings
        state="idle"
        size="min(120vmin, 1100px)"
        animated={false}
        style={{
          position: "absolute",
          left: `${DEFAULT_FOCUS.x * 100}%`,
          top: `${DEFAULT_FOCUS.y * 100}%`,
          transform: "translate(-50%, -50%)",
        }}
      />
    </div>
  );
}

const HaloField = dynamic(() => import("./HaloField"), {
  ssr: false,
  loading: LoadingRings,
});

// Same props as HaloField; className defaults to filling the parent (Stage's slot).
export function HaloFieldLazy({ className = "absolute inset-0", ...props }: HaloFieldProps) {
  return <HaloField className={className} {...props} />;
}

export default HaloFieldLazy;
