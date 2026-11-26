// The bottom bar of a phone or tablet (below 1024 px): a glass dock with a few
// labelled icons for the main places (Начало, Провери, Вход for a guest; Начало and
// the person's own area for a logged-in person, see siteNav.ts, D35).
//
// Why a dock and not a "hamburger" button: older people do not look for hidden menus,
// and a thumb reaches the bottom of the screen. So every word is always visible,
// every target is at least 56 px high, nothing grows under the finger
// (no magnification) and the bar keeps clear of the phone's home indicator
// (env(safe-area-inset-bottom)).
//
// Hidden on the older person's check screens (/protected and its /dev preview), where
// only the one big button may be seen, and on paper. A Client Component because it
// needs the current page (usePathname, inside <Suspense> for Cache Components).
"use client";

import { Bell, House, LayoutDashboard, LogIn, PhoneCall, ShieldCheck, Users } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Suspense, type ReactNode } from "react";
import { cn } from "@/components/ui/cn";
import { isCurrentPath, isProtectedFlow, type DockIcon, type DockLink } from "./siteNav";

// One line icon (lucide, ISC licence) per kind of place. Record = a dict with one
// key per DockIcon value.
const ICONS: Record<DockIcon, ReactNode> = {
  home: <House />,
  login: <LogIn />,
  family: <Users />,
  alerts: <Bell />,
  moderator: <ShieldCheck />,
  admin: <LayoutDashboard />,
  check: <PhoneCall />,
};

type SiteDockProps = { label: string; links: DockLink[] };

export function SiteDock(props: SiteDockProps) {
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

function DockBar({ label, links, pathname }: SiteDockProps & { pathname: string | null }) {
  return (
    <nav aria-label={label} className="site-dock lg:hidden print:hidden">
      <ul className="site-dock-bar site-glass grid grid-flow-col auto-cols-fr">
        {links.map((link) => {
          const current = isCurrentPath(pathname, link.href);
          return (
            <li key={link.href} className="min-w-0">
              <Link
                href={link.href}
                aria-current={current ? "page" : undefined}
                className={cn(
                  "site-dock-link pressable",
                  current ? "text-fg" : "text-fg-muted hover:text-fg",
                )}
              >
                <span aria-hidden="true" className="site-dock-icon">
                  {ICONS[link.icon]}
                </span>
                <span className="site-dock-label">{link.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
