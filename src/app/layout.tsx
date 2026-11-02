// The root layout: the <html> and <body> that wrap every page of the app.
// The page language is Bulgarian (lang="bg"), which screen readers and browsers use.

import type { Metadata } from "next";
import type { ReactNode } from "react";
import { bg } from "@/i18n/bg";
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
      <body className="flex min-h-full flex-col font-sans">{children}</body>
    </html>
  );
}
