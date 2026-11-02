// The home page ("/"): a short, temporary Bulgarian landing page.
// All text comes from src/i18n/bg.ts. The real design arrives with the design system (W1-11).

import { bg } from "@/i18n/bg";

export default function HomePage() {
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col justify-center gap-6 px-6 py-16">
      <h1 className="text-4xl font-bold sm:text-5xl">{bg.app.name}</h1>
      <p className="text-2xl leading-snug">{bg.app.tagline}</p>
      <p className="text-lg text-muted">{bg.app.comingSoon}</p>
    </main>
  );
}
