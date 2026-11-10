// /karta: the public scam map „Карта на измамите“ (W3-03, brief 5.2 D). Anyone, no
// login. The 28 districts coloured by the number of APPROVED reports, the current
// "scam waves", a panel per district and a table of all districts. Only districts are
// ever shown, never addresses (privacy). „Карта“ in Latin letters, like /signal.
// A Server Component: the title and intro are pre-rendered at `next build`; the data
// and the map are loaded in the browser by ScamMap (a Client Component).

import type { Metadata } from "next";
import { ScamMap } from "@/components/map/ScamMap";
import { bg } from "@/i18n/bg";

export const metadata: Metadata = {
  title: `${bg.map.title} | ${bg.app.name}`,
  description: bg.map.lead,
};

export default function MapPage() {
  return (
    <main className="map">
      <header className="report-intro">
        <h1>{bg.map.title}</h1>
        <p className="report-lead">{bg.map.lead}</p>
        <p className="muted">{bg.map.note}</p>
      </header>
      <ScamMap />
    </main>
  );
}
