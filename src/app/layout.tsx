// The root layout: the <html> and <body> that wrap every page of the app, and the
// shared frame around each page: the header (logo, menu, theme switch) and the footer.
// The page language is Bulgarian (lang="bg"), which screen readers and browsers use.

import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { THEME_COLOR_DARK, THEME_COLOR_LIGHT } from "@/config/pwa";
import { bg } from "@/i18n/bg";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { RegisterServiceWorker } from "@/components/pwa/RegisterServiceWorker";
import { Toaster } from "@/components/ui/Toast";
import { jetbrains, sofia, sofiaCondensed } from "./fonts";
import "./globals.css";

// Title and description shown in the browser tab and in search results.
// appleWebApp + icons.apple (W2-09): what an iPhone needs to install Scamly from
// „Добави към началния екран“ as an app (name under the icon, the icon itself, the
// status bar). The web app manifest is src/app/manifest.ts.
export const metadata: Metadata = {
  title: bg.app.metaTitle,
  description: bg.app.description,
  appleWebApp: {
    capable: true,
    title: bg.app.name,
    statusBarStyle: "default",
  },
  icons: {
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
  // Next.js writes the new standard name "mobile-web-app-capable"; older iPhones
  // (before iOS 17.4) still look for Apple's old name, so we add it too.
  other: { "apple-mobile-web-app-capable": "yes" },
};

// The colour of the browser bar (and of the installed app's top bar): the header
// colour of the light or the dark theme, whichever the phone uses.
export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: THEME_COLOR_LIGHT },
    { media: "(prefers-color-scheme: dark)", color: THEME_COLOR_DARK },
  ],
};

// Runs before the first paint: puts the saved theme on <html>, so a person who chose
// the light theme never sees a dark flash (and the other way round). Plain text,
// no user data. The same key as in src/components/ui/ThemeToggle.tsx.
const THEME_SCRIPT = `try{var t=localStorage.getItem("scamly-theme");if(t==="light"||t==="dark"||t==="system")document.documentElement.dataset.theme=t}catch(e){}`;

// Also before any other script: keeps the browser's early "this app can be installed"
// event (beforeinstallprompt), which can arrive before src/lib/install.ts has loaded.
const INSTALL_SCRIPT = `addEventListener("beforeinstallprompt",function(e){e.preventDefault();window.__scamlyInstallEvent=e})`;

// `{ children }: { children: ReactNode }` means: this function receives one argument,
// an object with a `children` field (the page to show), like a Python keyword argument.
export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    // suppressHydrationWarning: the theme script above changes data-theme before
    // React starts, which is expected.
    <html
      lang="bg"
      className={`h-full antialiased ${sofia.variable} ${sofiaCondensed.variable} ${jetbrains.variable}`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
        <script dangerouslySetInnerHTML={{ __html: INSTALL_SCRIPT }} />
      </head>
      <body className="flex min-h-full flex-col">
        {/* The first thing a keyboard user reaches: jumps over the menu to the page. */}
        <a
          href="#content"
          className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-(--z-index-toast) focus:rounded-md focus:bg-accent focus:px-4 focus:py-3 focus:font-semibold focus:text-on-accent"
        >
          {bg.layout.skipToContent}
        </a>
        <SiteHeader />
        {/* The page itself. It grows to fill the screen, so a short page still has
            the footer at the bottom. tabIndex={-1} lets the skip link move focus here. */}
        <div id="content" tabIndex={-1} className="flex flex-1 flex-col">
          {children}
        </div>
        <SiteFooter />
        <Toaster />
        {/* The service worker: push alerts and the offline card (W2-09). */}
        <RegisterServiceWorker />
      </body>
    </html>
  );
}
