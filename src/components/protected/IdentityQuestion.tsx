// The first two screens of „Провери истинския“ on the older person's phone (P-06):
//
//   RelativeQuestion  „Казват ли, че са някой близък?“ Да / Не, right after the big
//                     button (one-button flow, D34). Same look as the questions of the
//                     check (QuestionWizard): big tiles, „Назад“ / „Напред“ at the bottom.
//   FamilyTiles       the family as big round-initial tiles, in calling order
//                     (GET /api/identity-checks/family). One tap asks that person. A
//                     contact without Scamly is shown too, with a tel: button to the
//                     SAVED number, so the person can still call them.

import { ArrowLeft, ArrowRight } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { callApi } from "@/components/family/api";
import { BigChoice } from "@/components/ui/BigChoice";
import { Button } from "@/components/ui/Button";
import { Notice } from "@/components/ui/Notice";
import { Skeleton } from "@/components/ui/Skeleton";
import { bg } from "@/i18n/bg";
import type { IdentityFamilyDto, IdentityPersonDto } from "@/schemas/identityChecks";
import { withIcons } from "./answerIcons";
import { CallContactButton } from "./CallContactButton";

const YES_NO = withIcons([
  { value: "yes", label: bg.protectedCheck.tri.yes },
  { value: "no", label: bg.protectedCheck.tri.no },
]);

export function RelativeQuestion({
  onAnswer,
  onBack,
}: {
  onAnswer: (relative: boolean) => void;
  onBack: () => void;
}) {
  const [value, setValue] = useState<string | null>(null);
  const heading = useRef<HTMLHeadingElement>(null);

  // A new screen: the focus moves to the question, so a screen reader reads it.
  useEffect(() => {
    heading.current?.focus();
  }, []);

  return (
    <section className="check-questions flex flex-col gap-6" aria-labelledby="ask-relative">
      <div className="check-step flex flex-col gap-6">
        <h1 id="ask-relative" className="check-question" ref={heading} tabIndex={-1}>
          {bg.identityAsk.question}
        </h1>
        <p className="-mt-2 text-xl text-fg-muted">{bg.identityAsk.hint}</p>
        <BigChoice
          question={bg.identityAsk.question}
          hideQuestion
          size="large"
          options={YES_NO}
          value={value}
          onChange={setValue}
          onPick={(answer) => onAnswer(answer === "yes")}
        />
      </div>
      <div className="check-nav flex gap-3">
        <Button variant="secondary" size="xl" className="check-back" onClick={onBack}>
          <ArrowLeft className="size-6 shrink-0" aria-hidden="true" />
          {bg.protectedCheck.back}
        </Button>
        <Button
          size="xl"
          className="flex-1"
          disabled={value === null}
          onClick={() => onAnswer(value === "yes")}
        >
          {bg.protectedCheck.next}
          <ArrowRight className="size-6 shrink-0" aria-hidden="true" />
        </Button>
      </div>
    </section>
  );
}

type FamilyState =
  | { kind: "loading" }
  | { kind: "error"; message: string }
  | { kind: "ready"; people: IdentityPersonDto[] };

export function FamilyTiles({
  onPick,
  onNone,
  onBack,
}: {
  onPick: (people: IdentityPersonDto[], person: IdentityPersonDto) => void;
  onNone: () => void; // „Никой от тях“ / „Продължете с въпросите“: the check only
  onBack: () => void;
}) {
  const [family, setFamily] = useState<FamilyState>({ kind: "loading" });
  const [attempt, setAttempt] = useState(0);
  const heading = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    heading.current?.focus();
  }, []);

  useEffect(() => {
    let active = true;
    async function load() {
      const result = await callApi<IdentityFamilyDto>("/api/identity-checks/family");
      if (!active) return;
      setFamily(
        result.ok
          ? { kind: "ready", people: result.data.people }
          : { kind: "error", message: result.messageBg },
      );
    }
    void load();
    return () => {
      active = false;
    };
  }, [attempt]);

  return (
    <section className="check-step flex flex-col gap-6" aria-labelledby="ask-tiles">
      <div className="flex flex-col gap-2">
        <h1 id="ask-tiles" className="check-question" ref={heading} tabIndex={-1}>
          {bg.identityAsk.tilesTitle}
        </h1>
        <p className="text-xl text-fg-muted">{bg.identityAsk.tilesHint}</p>
      </div>

      {family.kind === "loading" ? (
        <div className="check-ask-tiles">
          <p role="status" className="sr-only">
            {bg.identityAsk.loading}
          </p>
          <Skeleton className="h-40 rounded-[var(--radius-xl)]" />
          <Skeleton className="h-40 rounded-[var(--radius-xl)]" />
        </div>
      ) : null}

      {family.kind === "error" ? (
        <div className="flex flex-col gap-3">
          <Notice status="danger" role="alert" className="text-lg">
            {family.message}
          </Notice>
          <Button
            variant="secondary"
            size="xl"
            onClick={() => {
              setFamily({ kind: "loading" });
              setAttempt(attempt + 1);
            }}
          >
            {bg.identityAsk.retry}
          </Button>
        </div>
      ) : null}

      {family.kind === "ready" && family.people.length === 0 ? (
        <Notice status="info" className="text-lg">
          {bg.identityAsk.empty}
        </Notice>
      ) : null}

      {family.kind === "ready" && family.people.length > 0 ? (
        <ul className="check-ask-tiles" aria-label={bg.identityAsk.tilesLabel}>
          {family.people.map((person) => (
            <li key={`${person.priority}-${person.displayName}`}>
              {person.canReceive && person.userId !== null ? (
                <button
                  type="button"
                  className="check-ask-tile pressable"
                  onClick={() => onPick(family.people, person)}
                >
                  <span className="check-ask-avatar" aria-hidden="true">
                    {person.initials}
                  </span>
                  <span className="check-ask-name">{person.displayName}</span>
                </button>
              ) : (
                <div className="check-ask-tile" data-off="">
                  <span className="check-ask-avatar" aria-hidden="true">
                    {person.initials}
                  </span>
                  <span className="check-ask-name">{person.displayName}</span>
                  {person.phone === null ? (
                    <span className="check-ask-off">{bg.identityAsk.noAppNoPhone}</span>
                  ) : (
                    <>
                      <span className="check-ask-off">{bg.identityAsk.noApp}</span>
                      <CallContactButton
                        contact={{ displayName: person.displayName, phone: person.phone }}
                        variant="secondary"
                      />
                    </>
                  )}
                </div>
              )}
            </li>
          ))}
        </ul>
      ) : null}

      <div className="flex flex-col gap-3">
        {family.kind === "loading" ? null : (
          <Button variant="secondary" size="xl" onClick={onNone}>
            {family.kind === "ready" && family.people.length > 0
              ? bg.identityAsk.noneOfThem
              : bg.identityAsk.continueCheck}
          </Button>
        )}
        <Button variant="ghost" size="xl" className="text-fg-muted" onClick={onBack}>
          <ArrowLeft className="size-6 shrink-0" aria-hidden="true" />
          {bg.protectedCheck.back}
        </Button>
      </div>
    </section>
  );
}
