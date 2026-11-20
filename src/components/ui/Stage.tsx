// Stage: the full-bleed hero frame. A large rounded (32 px) panel set 12–16 px in
// from the screen edges, with the aurora horizon glowing from its top edge and the
// top highlight. Heroes and the protected person's big screens sit on it.
// `field` is a slot for a background layer, drawn under the content and hidden from
// screen readers: usually the live halo, `field={<HaloFieldLazy state="idle" />}`
// (HaloFieldLazy.tsx loads the WebGL HaloField only in the browser). A Server Component.

import type { ElementType, HTMLAttributes, ReactNode } from "react";
import { cn } from "./cn";

type StageProps = HTMLAttributes<HTMLElement> & {
  as?: ElementType;
  field?: ReactNode;
  // false: no aurora glow (e.g. under a full-screen verdict with its own colour).
  aurora?: boolean;
};

export function Stage({
  as: Tag = "section",
  field,
  aurora = true,
  className,
  children,
  ...props
}: StageProps) {
  return (
    <Tag
      className={cn(
        "relative isolate mx-3 overflow-hidden rounded-xl border border-glass-line bg-elevated shadow-raised md:mx-4",
        className,
      )}
      {...props}
    >
      {aurora ? (
        <div aria-hidden="true" className="aurora pointer-events-none absolute inset-0 -z-10" />
      ) : null}
      {field === undefined ? null : (
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10">
          {field}
        </div>
      )}
      {children}
    </Tag>
  );
}
