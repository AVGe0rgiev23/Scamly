// The web app manifest (task W2-09): tells the phone that Scamly is an app that can be
// installed. Next.js serves what this function returns as /manifest.webmanifest and
// adds <link rel="manifest"> to every page by itself (the `manifest` file convention).
//
// Why it matters: with `display: "standalone"` the installed Scamly opens in its own
// window, without the browser's address bar. On an iPhone, web push only works for a
// site added to the home screen WITH such a manifest; without it, „Добави към
// началния екран“ is only a Safari bookmark and push is not available.
// The icons are our own drawings, made by scripts/icons/generate.mjs.

import type { MetadataRoute } from "next";
import { BACKGROUND_COLOR, THEME_COLOR_LIGHT } from "@/config/pwa";
import { bg } from "@/i18n/bg";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: bg.app.metaTitle,
    short_name: bg.app.name,
    description: bg.app.description,
    lang: "bg",
    dir: "ltr",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    theme_color: THEME_COLOR_LIGHT,
    background_color: BACKGROUND_COLOR,
    icons: [
      // "any": shown as it is (with our own blue square).
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      // "maskable": Android may cut it into a circle or another shape, so the mark
      // sits inside the middle "safe zone".
      {
        src: "/icons/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
