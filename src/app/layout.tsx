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
};

// The colour of the browser bar (and of the installed app's top bar): the header
// colour of the light or the dark theme, whichever the phone uses.
export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: THEME_COLOR_LIGHT },
    { media: "(prefers-color-scheme: dark)", color: THEME_COLOR_DARK },
  ],
};

// `{ children }: { children: ReactNode }` means: this function receives one argument,
// an object with a `children` field (the page to show), like a Python keyword argument.
export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="bg" className="h-full antialiased">
      <body className="flex min-h-full flex-col font-sans">
        {/* The first thing a keyboard user reaches: jumps over the menu to the page. */}
        <a href="#content" className="skip-link">
          {bg.layout.skipToContent}
        </a>
        <SiteHeader />
        {/* The page itself. It grows to fill the screen, so a short page still has
            the footer at the bottom. tabIndex={-1} lets the skip link move focus here. */}
        <div id="content" tabIndex={-1} className="site-content">
          {children}
        </div>
        <SiteFooter />
        {/* The service worker: push alerts and the offline card (W2-09). */}
        <RegisterServiceWorker />
      </body>
    </html>
  );
}
