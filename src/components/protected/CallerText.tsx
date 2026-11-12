// The last, optional step of the call check: „Какво ви казаха? (по желание)“.
// A big text field (at most 2000 characters, with a counter), „Прескочи“ (check
// without text) and „Провери“ (check with the text). The engine also reads this
// text (word stems, шльокавица, typos), so a few words can make the verdict sharper.
// Under the field: the optional „Говорете“ button (VoiceInput, W2-10) adds spoken text.

import { ArrowLeft } from "lucide-react";
import { useEffect, useId, useRef } from "react";
import { fill } from "@/components/family/format";
import { Button } from "@/components/ui/Button";
import { Textarea } from "@/components/ui/Field";
import { MAX_TEXT_LENGTH } from "@/engine";
import { bg } from "@/i18n/bg";
import { appendSpoken } from "./voice";
import { VoiceInput } from "./VoiceInput";

type CallerTextProps = {
  text: string;
  onTextChange: (text: string) => void;
  onSubmit: (text: string) => void;
  onBack: () => void;
  sending: boolean;
  voiceEnabled: boolean; // the FEATURE_VOICE switch (W2-10)
};

export function CallerText({
  text,
  onTextChange,
  onSubmit,
  onBack,
  sending,
  voiceEnabled,
}: CallerTextProps) {
  const fieldId = useId();
  const hintId = useId();
  const counterId = useId();
  const field = useRef<HTMLTextAreaElement>(null);

  // A new screen: put the focus on the field (its label is read aloud).
  useEffect(() => {
    field.current?.focus();
  }, []);

  return (
    <section className="flex flex-col gap-5">
      <h1 className="text-h1">
        <label htmlFor={fieldId}>{bg.protectedCheck.textLabel}</label>
      </h1>
      <p id={hintId} className="text-fg-muted">
        {bg.protectedCheck.textHint}
      </p>
      <div>
        <Textarea
          id={fieldId}
          ref={field}
          size="lg"
          rows={5}
          maxLength={MAX_TEXT_LENGTH}
          value={text}
          onChange={(event) => onTextChange(event.target.value)}
          aria-describedby={`${hintId} ${counterId}`}
          disabled={sending}
        />
        <p id={counterId} className="tabular mt-1.5 text-right font-mono text-sm text-fg-subtle">
          {fill(bg.protectedCheck.textCounter, { count: text.length, max: MAX_TEXT_LENGTH })}
        </p>
      </div>
      <VoiceInput
        enabled={voiceEnabled}
        disabled={sending}
        onSpoken={(spoken) => onTextChange(appendSpoken(text, spoken, MAX_TEXT_LENGTH))}
      />
      {/* Read aloud while the answers are sent. */}
      <p role="status" className="sr-only">
        {sending ? bg.protectedCheck.checking : null}
      </p>
      <div className="flex flex-col gap-3 sm:flex-row-reverse">
        <Button size="xl" className="flex-1" onClick={() => onSubmit(text)} loading={sending}>
          {sending ? bg.protectedCheck.checking : bg.protectedCheck.check}
        </Button>
        <Button variant="secondary" size="xl" onClick={() => onSubmit("")} disabled={sending}>
          {bg.protectedCheck.skip}
        </Button>
      </div>
      <Button variant="ghost" size="xl" className="self-start" onClick={onBack} disabled={sending}>
        <ArrowLeft className="size-6" aria-hidden="true" />
        {bg.protectedCheck.back}
      </Button>
    </section>
  );
}
