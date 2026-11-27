// The links in the header pill (desktop) with a sliding "spotlight": a soft lit pill
// with a halo hairline that glides under the link you point at or tab to, and rests
// on the page you are on. When nothing is pointed at and no link is the current
// page, the light fades out.
//
// How it moves: the light is ONE element as wide as the whole row, cut down to the
// size of one link with `clip-path: inset(top right bottom left round 999px)`.
// Pointing at a link only changes two CSS variables (--spot-l, --spot-r: how much to
// cut from the left and the right), and CSS animates the clip-path between them
// (globals.css .site-spot). No React re-render, no layout animation. With reduced
// motion the light jumps instead of gliding.
//
// Only ONE link is the current page: the most specific one (currentHref), so on
// /family/alerts „Сигнали“ is lit, not „Семейство“ as well. Pressing a link sends a
// soft halo pulse through it (CSS :active, globals.css .site-nav-link::after). The
// family's „Сигнали“ carries a small live badge (NavBadge).
//
// usePathname (which page is open) needs a <Suspense> boundary with Cache Components
// on pages with an unknown dynamic part (/kak-raboti/[slug]): the fallback is the
// same row without a current page, pre-rendered into the static shell.
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Suspense, useCallback, useEffect, useRef } from "react";
import { cn } from "@/components/ui/cn";
import { NavBadge } from "./NavBadge";
import { currentHref, type NavItem } from "./siteNav";

type SpotlightNavProps = {
  label: string; // the name of the nav landmark, read aloud
  links: NavItem[];
  className?: string;
  // Only for the preview page /dev/nav: pretend this page is open.
  previewPath?: string;
};

export function SpotlightNav(props: SpotlightNavProps) {
  if (props.previewPath !== undefined) {
    return <SpotlightRow {...props} pathname={props.previewPath} />;
  }
  return (
    <Suspense fallback={<SpotlightRow {...props} pathname={null} />}>
      <SpotlightNavAtPath {...props} />
    </Suspense>
  );
}

function SpotlightNavAtPath(props: SpotlightNavProps) {
  const pathname = usePathname();
  return <SpotlightRow {...props} pathname={pathname} />;
}

function SpotlightRow({
  label,
  links,
  className,
  pathname,
}: SpotlightNavProps & { pathname: string | null }) {
  const current = currentHref(pathname, links);
  // A ref is a box that keeps the real DOM element between renders (like an
  // attribute on a Python object that React fills in).
  const trackRef = useRef<HTMLDivElement>(null);

  // Moves the light over `target`, or fades it out when there is no target.
  const moveTo = useCallback((target: Element | null) => {
    const track = trackRef.current;
    if (track === null) return;
    if (target === null) {
      track.dataset.spot = "off";
      return;
    }
    const row = track.getBoundingClientRect();
    const box = target.getBoundingClientRect();
    track.style.setProperty("--spot-l", `${(box.left - row.left).toFixed(1)}px`);
    track.style.setProperty("--spot-r", `${(row.right - box.right).toFixed(1)}px`);
    track.dataset.spot = "on";
  }, []);

  // Back to the current page (or out, if this row has none).
  const rest = useCallback(() => {
    moveTo(trackRef.current?.querySelector('[aria-current="page"]') ?? null);
  }, [moveTo]);

  // Place the light on the current page after every navigation and whenever the row
  // changes size (a new window width, or the badge appearing). The first placement
  // happens before transitions are switched on, so the light does not fly in from
  // the edge when the page opens. On a new page it glides from the old link.
  useEffect(() => {
    const track = trackRef.current;
    rest();
    const frame = requestAnimationFrame(() => {
      if (track !== null) track.dataset.ready = "true";
    });
    // ResizeObserver calls `rest` when the row's size changes (like a file watcher).
    const observer = new ResizeObserver(() => rest());
    if (track !== null) observer.observe(track);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, [rest, pathname]);

  return (
    <nav aria-label={label} className={className}>
      <div
        ref={trackRef}
        className="site-spot-track relative"
        data-spot="off"
        onPointerLeave={rest}
        onBlur={(event) => {
          // Focus left the whole row (not just moved to the next link).
          if (!event.currentTarget.contains(event.relatedTarget as Node | null)) rest();
        }}
      >
        <span aria-hidden="true" className="site-spot" />
        <ul className="relative flex items-center">
          {links.map((link) => {
            const isCurrent = link.href === current;
            return (
              <li key={link.href}>
                <Link
                  href={link.href}
                  aria-current={isCurrent ? "page" : undefined}
                  onPointerEnter={(event) => moveTo(event.currentTarget)}
                  onFocus={(event) => moveTo(event.currentTarget)}
                  className={cn(
                    "site-nav-link relative flex min-h-12 items-center gap-2 rounded-full px-3.5 text-[0.9375rem] font-medium whitespace-nowrap no-underline transition-colors duration-150",
                    isCurrent ? "text-fg" : "text-fg-muted hover:text-fg",
                  )}
                >
                  {link.label}
                  {link.badge === "identity" ? <NavBadge pathname={pathname} /> : null}
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </nav>
  );
}
