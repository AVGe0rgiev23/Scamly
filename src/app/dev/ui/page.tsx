// Interactive component gallery, with independent light and dark examples.
"use client";

import { useState } from "react";
import { BigChoice } from "@/components/ui/BigChoice";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Verdict } from "@/components/ui/Verdict";
import { bg } from "@/i18n/bg";

function Samples({ theme }: { theme: "light" | "dark" }) {
  // useState remembers a value between renders, like an instance field in Python.
  const [answer, setAnswer] = useState<string | null>(null);
  const [clicked, setClicked] = useState(false);
  return (
    <section data-theme={theme} className="preview-panel" aria-label={bg.theme[theme]}>
      <h2>{bg.theme[theme]}</h2>
      <p className="muted">{bg.ui.typeSample}</p>
      <Card>
        <h3>{bg.ui.cardTitle}</h3>
        <p>{bg.ui.cardText}</p>
        <div className="sample-actions">
          <Button onClick={() => setClicked(!clicked)} aria-pressed={clicked}>
            {clicked ? bg.ui.clicked : bg.ui.primary}
          </Button>
          <Button variant="secondary">{bg.ui.secondary}</Button>
          <Button disabled>{bg.ui.disabled}</Button>
        </div>
      </Card>
      <BigChoice question={bg.ui.question} value={answer} onChange={setAnswer} />
      <Verdict level="red" />
      <Verdict level="yellow" />
      <Verdict level="green" />
    </section>
  );
}

export default function UiPage() {
  return (
    <main className="ui-preview">
      <header className="preview-header">
        <div>
          <p className="muted">{bg.app.name}</p>
          <h1>{bg.ui.title}</h1>
          <p>{bg.ui.description}</p>
        </div>
      </header>
      <div className="preview-grid">
        <Samples theme="light" />
        <Samples theme="dark" />
      </div>
    </main>
  );
}
