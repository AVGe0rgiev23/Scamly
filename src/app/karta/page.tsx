// /karta: the public scam map „Карта на измамите“ (W3-03, brief 5.2 D). Anyone, no
// login. The 28 districts coloured by the number of APPROVED reports, the current
// "scam waves", a panel per district and a table of all districts. Only districts are
// ever shown, never addresses (privacy). „Карта“ in Latin letters, like /signal.
// A Server Component: the title and intro are pre-rendered at `next build`; the data
// and the map are loaded in the browser by ScamMap (a Client Component).
// Look (Ореол v3): a soft aurora behind the page head (eyebrow, title, lead, note);
// the map itself is the hero (see ScamMap.tsx and map.css).

import type { Metadata } from "next";
import { ScamMap } from "@/components/map/ScamMap";
import { bg } from "@/i18n/bg";
import "@/components/map/map.css";

export const metadata: Metadata = {
  title: `${bg.map.title} | ${bg.app.name}`,
  description: bg.map.lead,
};

export default function MapPage() {
  return (
    <main className="map-page shell py-10 md:py-16">
      <div className="map-page-aurora" aria-hidden="true" />
      <header className="map-head">
        <p className="eyebrow map-eyebrow">{bg.map.eyebrow}</p>
        <h1 className="text-h1">{bg.map.title}</h1>
        <p className="mt-4 max-w-[56ch] text-lg">{bg.map.lead}</p>
        <p className="mt-2 max-w-[56ch] text-fg-muted">{bg.map.note}</p>
      </header>
      <ScamMap />
    </main>
  );
}
