// Browser-test previews of the education pages (W3-05): /dev/kak-raboti and
// /dev/kak-raboti/karta?slug=…. The real pages read the cards on the SERVER, where
// Playwright's page.route() can't reach. These previews load the same published
// cards from GET /api/scripts in the browser instead (the tests answer it with fake
// cards) and render them with the SAME components (ScriptList, ScriptCard).
"use client";

import { useEffect, useState } from "react";
import { callApi } from "@/components/family/api";
import { bg } from "@/i18n/bg";
import type { PublicScriptDto } from "@/schemas/scripts";
import { EducationIntro } from "./EducationIntro";
import { ScriptCard } from "./ScriptCard";
import { ScriptList, ScriptsUnavailable } from "./ScriptList";

const PREVIEW_PATH = "/dev/kak-raboti";

type LoadState =
  { kind: "loading" } | { kind: "error" } | { kind: "ready"; scripts: PublicScriptDto[] };

// Loads the published cards once, like the real page does on the server.
function usePublishedScripts(): LoadState {
  const [state, setState] = useState<LoadState>({ kind: "loading" });
  useEffect(() => {
    let active = true;
    async function load() {
      const result = await callApi<{ scripts: PublicScriptDto[] }>("/api/scripts");
      if (!active) return;
      setState(result.ok ? { kind: "ready", scripts: result.data.scripts } : { kind: "error" });
    }
    void load();
    return () => {
      active = false;
    };
  }, []);
  return state;
}

export function EducationListPreview() {
  const state = usePublishedScripts();
  return (
    <main className="education">
      <EducationIntro />
      <section aria-labelledby="edu-list-title" className="edu-list-section">
        <h2 id="edu-list-title">{bg.education.listTitle}</h2>
        {state.kind === "loading" ? <p className="edu-message">{bg.common.loading}</p> : null}
        {state.kind === "error" ? <ScriptsUnavailable /> : null}
        {state.kind === "ready" ? (
          <ScriptList
            scripts={state.scripts}
            hrefFor={(slug) => `${PREVIEW_PATH}/karta?slug=${encodeURIComponent(slug)}`}
          />
        ) : null}
      </section>
    </main>
  );
}

export function EducationCardPreview() {
  const state = usePublishedScripts();
  // The card's address is in ?slug=…. "ready" only happens in the browser (after the
  // effect above), so `window` exists there and the server's HTML stays the same.
  const script =
    state.kind === "ready"
      ? state.scripts.find(
          (card) => card.slug === new URLSearchParams(window.location.search).get("slug"),
        )
      : undefined;
  return (
    <main className="education">
      {state.kind === "loading" ? <p className="edu-message">{bg.common.loading}</p> : null}
      {state.kind === "error" ? <ScriptsUnavailable /> : null}
      {state.kind === "ready" && script === undefined ? (
        <p className="edu-message">{bg.common.notFoundText}</p>
      ) : null}
      {script !== undefined ? <ScriptCard script={script} listHref={PREVIEW_PATH} /> : null}
    </main>
  );
}
