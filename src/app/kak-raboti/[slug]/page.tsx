// /kak-raboti/<slug>: one education card, e.g. /kak-raboti/politsai (W3-05).
// Anyone, no login: how the call starts, what they say, what to do; big text and a
// print button, so a grandchild can print it for a grandparent.
//
// The card is read from the database at request time (the address is request data
// and the card can change), inside <Suspense>, with the cookie-less public client.
// A wrong address or a draft card shows the normal 404 page.

import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { CardLoading } from "@/components/education/Loading";
import { ScriptCard } from "@/components/education/ScriptCard";
import { ScriptsUnavailable } from "@/components/education/ScriptList";
import { bg } from "@/i18n/bg";
import { createEducationDeps, loadEducationCard } from "@/server/services/educationService";

export const metadata: Metadata = {
  title: `${bg.education.title} | ${bg.app.name}`,
};

export default function EducationCardPage({ params }: PageProps<"/kak-raboti/[slug]">) {
  return (
    <main className="shell py-10 md:py-16">
      <Suspense fallback={<CardLoading />}>
        <PublishedCard params={params} />
      </Suspense>
    </main>
  );
}

async function PublishedCard({ params }: { params: PageProps<"/kak-raboti/[slug]">["params"] }) {
  await connection();
  const { slug } = await params;
  const script = await loadEducationCard(createEducationDeps(), slug);
  if (script === "not_found") {
    notFound();
  }
  if (script === null) {
    return <ScriptsUnavailable />;
  }
  return <ScriptCard script={script} />;
}
