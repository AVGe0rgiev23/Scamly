// The Scamly logo: the halo mark (HaloLogo, our own drawing) and the word „Scamly“
// in Sofia Sans Semi Condensed, set tight. Logo is the link to the home page used by
// the header; its accessible name is „Scamly, Начална страница“ (the second part is
// only read aloud). LogoMark is the mark alone, for places that already say the name
// (the footer, the iPhone install steps).

import Link from "next/link";
import { HaloLogo } from "@/components/ui/HaloLogo";
import { cn } from "@/components/ui/cn";
import { ROUTES } from "@/config/routes";
import { bg } from "@/i18n/bg";

export function LogoMark({ size = 28, className }: { size?: number; className?: string }) {
  return <HaloLogo size={size} className={className} />;
}

// The wordmark on its own: the name in the display face, a little tighter than the
// headings so the six letters hold together like one shape.
export function Wordmark({ className }: { className?: string }) {
  return (
    <span className={cn("font-display font-bold tracking-[-0.035em] text-fg", className)}>
      {bg.app.name}
    </span>
  );
}

export function Logo({ className }: { className?: string }) {
  return (
    <Link
      href={ROUTES.home}
      className={cn(
        "brand-logo group flex min-h-12 shrink-0 items-center gap-2.5 rounded-full pr-1 pl-1 no-underline sm:pr-2",
        className,
      )}
    >
      <LogoMark size={30} className="brand-logo-mark" />
      <Wordmark className="text-[1.375rem] leading-none" />
      {/* sr-only: hidden on screen, read by screen readers. */}
      <span className="sr-only">, {bg.layout.homeLink}</span>
    </Link>
  );
}
