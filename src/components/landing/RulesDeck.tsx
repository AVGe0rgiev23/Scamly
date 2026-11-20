// The six hard rules (D10) as a deck of tall glass cards that scrolls sideways and
// snaps card by card (CSS scroll snap: the browser does the scrolling, we only say
// where to stop). Each card: a large numeral, the rule's name and its explanation,
// straight from the engine's texts (bg.engine.hardRules).
//
// On a desktop with a mouse the name "morphs" into the explanation on hover or
// keyboard focus (landing.css); on touch screens both are always shown. The two round
// buttons scroll by one card for mouse users; arrow keys and swiping work anyway.
"use client";

import { ArrowLeft, ArrowRight } from "lucide-react";
import { useRef } from "react";
import { Button } from "@/components/ui/Button";
import { fill } from "@/components/family/format";
import { HARD_RULE_IDS } from "@/engine";
import { bg } from "@/i18n/bg";

const d = bg.landing.rulesDeck;

export function RulesDeck({ labelledBy }: { labelledBy: string }) {
  const deckRef = useRef<HTMLOListElement>(null);

  // Scrolls by one card (its width plus the gap), in the given direction (-1 or 1).
  function scrollByCard(direction: number) {
    const deck = deckRef.current;
    const card = deck?.querySelector("li");
    if (!deck || !card) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    deck.scrollBy({
      left: direction * (card.getBoundingClientRect().width + 16),
      behavior: reduce ? "auto" : "smooth",
    });
  }

  return (
    <div>
      <ol ref={deckRef} aria-labelledby={labelledBy} className="landing-deck">
        {HARD_RULE_IDS.map((id, index) => {
          const rule = bg.engine.hardRules[id];
          return (
            <li key={id} tabIndex={0} className="landing-rule glass">
              <span aria-hidden="true" className="landing-rule-numeral">
                {index + 1}
              </span>
              <span className="sr-only">
                {fill(d.card, { n: index + 1, total: HARD_RULE_IDS.length })}:{" "}
              </span>
              <div className="landing-rule-morph">
                <h3 className="landing-rule-name">{rule.name}</h3>
                <p className="landing-rule-text">{rule.explanation}</p>
              </div>
            </li>
          );
        })}
      </ol>
      <div className="shell mt-6 flex items-center justify-between gap-4">
        <p className="text-sm text-fg-muted">{d.swipe}</p>
        <div className="hidden gap-2 md:flex">
          <Button
            variant="secondary"
            size="icon"
            aria-label={d.prev}
            onClick={() => scrollByCard(-1)}
          >
            <ArrowLeft className="size-5" aria-hidden="true" />
          </Button>
          <Button
            variant="secondary"
            size="icon"
            aria-label={d.next}
            onClick={() => scrollByCard(1)}
          >
            <ArrowRight className="size-5" aria-hidden="true" />
          </Button>
        </div>
      </div>
    </div>
  );
}
