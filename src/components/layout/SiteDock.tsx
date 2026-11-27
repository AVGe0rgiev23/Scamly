// The bottom bar of a phone or tablet (below 1024 px): a glass dock with the same
// items as the header pill, each a labelled icon (siteNav.ts: a guest gets Начало /
// Как работи / Провери / Вход, a family member Семейство / Сигнали / Помощ, …).
//
// Why a dock and not a "hamburger" button: older people do not look for hidden menus,
// and a thumb reaches the bottom of the screen. So every word is always visible,
// every target is at least 56 px high (64 px on the older person's phone), nothing
// grows under the finger and the bar keeps clear of the phone's home indicator
// (env(safe-area-inset-bottom)).
//
// The current page sits on a lit plate with a halo bar on top. The plate is ONE
// element that slides from item to item: its position is just "item i of n"
// (--dock-i, --dock-n), and CSS moves it with translateX(i × 100 %) (globals.css
// .site-dock-spot). A press sends a soft halo pulse (CSS :active). With reduced
// motion the plate jumps and nothing pulses.
//
// Hidden on the older person's check screen (/protected and its /dev preview), where
// only the one big button may be seen, and on paper. A Client Component because it
// needs the current page (usePathname, inside <Suspense> for Cache Components).
"use client";

import {
  Bell,
  CircleHelp,
  House,
  LayoutDashboard,
  ListOrdered,
  LogIn,
  PhoneCall,
  ShieldCheck,
  Users,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Suspense, type CSSProperties, type ReactNode } from "react";
import { cn } from "@/components/ui/cn";
import { NavBadge } from "./NavBadge";
import { currentHref, isProtectedFlow, type DockIcon, type NavItem } from "./siteNav";

// One line icon (lucide, ISC licence) per kind of place. Record = a dict with one
// key per DockIcon value.
const ICONS: Record<DockIcon, ReactNode> = {
  home: <House />,
  how: <ListOrdered />,
  login: <LogIn />,
  family: <Users />,
  alerts: <Bell />,
  moderator: <ShieldCheck />,
  admin: <LayoutDashboard />,
  check: <PhoneCall />,
  help: <CircleHelp />,
};

type SiteDockProps = {
  label: string;
  links: NavItem[];
  // "large": 64 px targets for the older person's phone.
  size?: "normal" | "large";
  // Only for the preview page /dev/nav: pretend this page is open, and draw the dock
  // in the page instead of fixed to the bottom of the screen.
  previewPath?: string;
};

export function SiteDock(props: SiteDockProps) {
  if (props.previewPath !== undefined) {
    return <DockBar {...props} pathname={props.previewPath} />;
  }
  return (
    <Suspense fallback={<DockBar {...props} pathname={null} />}>
      <SiteDockAtPath {...props} />
    </Suspense>
  );
}

function SiteDockAtPath(props: SiteDockProps) {
  const pathname = usePathname();
  if (isProtectedFlow(pathname)) return null;
  return <DockBar {...props} pathname={pathname} />;
}

function DockBar({
  label,
  links,
  size = "normal",
  previewPath,
  pathname,
}: SiteDockProps & { pathname: string | null }) {
  const current = currentHref(pathname, links);
  const index = links.findIndex((link) => link.href === current);
  // The plate's place as two CSS variables (CSS does the moving).
  const spot = { "--dock-i": Math.max(index, 0), "--dock-n": links.length } as CSSProperties;

  return (
    <nav
      aria-label={label}
      className={cn("site-dock print:hidden", previewPath === undefined && "lg:hidden")}
      data-size={size}
      data-preview={previewPath === undefined ? undefined : true}
    >
      <div className="site-dock-bar site-glass">
        <span
          aria-hidden="true"
          className="site-dock-spot"
          data-shown={index >= 0 || undefined}
          style={spot}
        />
        <ul className="relative grid auto-cols-fr grid-flow-col gap-0.5">
          {links.map((link) => {
            const isCurrent = link.href === current;
            return (
              <li key={link.href} className="min-w-0">
                <Link
                  href={link.href}
                  aria-current={isCurrent ? "page" : undefined}
                  className={cn(
                    "site-dock-link pressable",
                    isCurrent ? "text-fg" : "text-fg-muted",
                  )}
                >
                  <span aria-hidden="true" className="site-dock-icon">
                    {ICONS[link.icon]}
                  </span>
                  <span className="site-dock-label">{link.label}</span>
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
