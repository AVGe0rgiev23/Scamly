// HaloRings: the halo („Ореол“) drawn with plain SVG circles and CSS, no JavaScript.
// Works in Server Components, for small places (the logo, a button, an empty state)
// and as the stand-in for HaloField on weak devices or without WebGL2.
// Colours come from the CSS variables --halo-1/2/3, --caution and --danger; the
// classes (.halo-rings …) and their animations live in src/app/globals.css.

import type { CSSProperties } from "react";
import { cn } from "./cn";
import type { HaloState } from "./halo/haloMath";
import { CORE_COLOUR, RING_LAYOUTS } from "./halo/ringLayout";

export type HaloRingsProps = {
  state: HaloState;
  // Width and height: a number means pixels, a string any CSS size ("100%", "40vmin").
  size?: number | string;
  // Gentle CSS animation; always off when the phone asks for reduced motion.
  animated?: boolean;
  className?: string;
  style?: CSSProperties; // extra inline style, e.g. to position the rings
};

export function HaloRings({
  state,
  size = 160,
  animated = true,
  className,
  style,
}: HaloRingsProps) {
  const rings = RING_LAYOUTS[state];
  // A CSS variable set from here; React's style type does not know custom names, so
  // we tell TypeScript "trust me, this is a style object" (like typing.cast in Python).
  const rootStyle = {
    ...style,
    width: size,
    height: size,
    "--halo-core": CORE_COLOUR[state],
  } as CSSProperties;

  return (
    <span
      aria-hidden="true"
      data-halo-state={state}
      className={cn("halo-rings", animated && "halo-rings-animated", className)}
      style={rootStyle}
    >
      <svg className="halo-rings-svg" viewBox="-100 -100 200 200" focusable="false">
        {rings.map((ring, index) => (
          <circle
            key={index}
            className="halo-rings-ring"
            cx={0}
            cy={0}
            r={ring.radius}
            strokeWidth={ring.width}
            opacity={ring.opacity}
            style={{
              stroke: ring.colour,
              // Each ring starts its breathing a little later → a wave going outward.
              animationDelay: state === "danger" ? undefined : `${index * -0.7}s`,
            }}
          />
        ))}
      </svg>
    </span>
  );
}

export default HaloRings;
