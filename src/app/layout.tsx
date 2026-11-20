// The root layout: the <html> and <body> that wrap every page of the app, and the
// shared frame around each page: the header (logo, menu, theme switch) and the footer.
// The page language is Bulgarian (lang="bg"), which screen readers and browsers use.

import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { INSTALL_SCRIPT, THEME_SCRIPT } from "@/config/inlineScripts";
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
// viewportFit "cover": the page may reach under a notch and the home indicator, so the
// phone dock can sit just above the indicator (env(safe-area-inset-bottom) in
// globals.css .site-dock); the body keeps its sides clear of a notch.
export const viewport: Viewport = {
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: THEME_COLOR_LIGHT },
    { media: "(prefers-color-scheme: dark)", color: THEME_COLOR_DARK },
  ],
};

// The two inline scripts in <head> (theme before the first paint, early install
// event) are in src/config/inlineScripts.ts.

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
        {/* The first thing a keyboard user reaches: jumps over the menu to the page.
            Hidden until focused; then a bright pill (like the header's main button)
            floats over the top-left corner of the header. */}
        <a
          href="#content"
          className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-(--z-index-toast) focus:inline-flex focus:min-h-12 focus:items-center focus:rounded-full focus:bg-primary focus:px-5 focus:font-semibold focus:text-on-primary focus:no-underline focus:shadow-overlay"
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
