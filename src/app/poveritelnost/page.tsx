// Public Bulgarian notice describing what Scamly stores and how users control it.
import type { Metadata } from "next";
import { bg } from "@/i18n/bg";

export const metadata: Metadata = { title: `${bg.privacy.title} | ${bg.app.name}` };

export default function PrivacyPage() {
  return (
    <article className="mx-auto max-w-3xl space-y-8 px-6 py-12">
      <header className="space-y-4">
        <h1 className="text-h1">{bg.privacy.title}</h1>
        <p className="text-lg text-fg-muted">{bg.privacy.intro}</p>
      </header>
      {bg.privacy.sections.map((section) => (
        <section key={section.title} className="space-y-2">
          <h2 className="text-h3">{section.title}</h2>
          <p className="text-fg-muted">{section.text}</p>
        </section>
      ))}
    </article>
  );
}
