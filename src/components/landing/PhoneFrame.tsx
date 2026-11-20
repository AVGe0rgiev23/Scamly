// PhoneFrame: a drawn phone for the home page (no screenshot): a lit bezel, a glass
// screen and a small „island“ at the top. The hero's demo and the sticky phone in
// „Как работи“ put their screens inside it. A Server Component; the tilt and the
// level colour come from the parent through `className` and `data-level`.

import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "@/components/ui/cn";

type PhoneFrameProps = HTMLAttributes<HTMLDivElement> & {
  // What the island at the top shows (a dot and a few words), or nothing.
  island?: ReactNode;
  children: ReactNode;
};

export function PhoneFrame({ island, className, children, ...props }: PhoneFrameProps) {
  return (
    <div className={cn("landing-phone", className)} {...props}>
      <div className="landing-phone-screen">
        {island === undefined ? (
          <div aria-hidden="true" className="landing-phone-island" />
        ) : (
          <div className="landing-phone-island">{island}</div>
        )}
        {children}
      </div>
      {/* The reflection on the glass; it moves a little with the tilt (landing.css). */}
      <div aria-hidden="true" className="landing-phone-glare" />
    </div>
  );
}
