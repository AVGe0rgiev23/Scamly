// The root layout: the <html> and <body> that wrap every page of the app, and the
// shared frame around each page: the header (logo, menu, theme switch) and the footer.
// The page language is Bulgarian (lang="bg"), which screen readers and browsers use.

import type { Metadata } from "next";
import type { ReactNode } from "react";
import { bg } from "@/i18n/bg";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { SiteHeader } from "@/components/layout/SiteHeader";
import "./globals.css";

// Title and description shown in the browser tab and in search results.
export const metadata: Metadata = {
  title: bg.app.metaTitle,
  description: bg.app.description,
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
      </body>
    </html>
  );
}
