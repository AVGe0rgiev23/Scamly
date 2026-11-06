// The last, optional step of the call check: „Какво ви казаха? (по желание)“.
// A big text field (at most 2000 characters, with a counter), „Прескочи“ (check
// without text) and „Провери“ (check with the text). The engine also reads this
// text (word stems, шльокавица, typos), so a few words can make the verdict sharper.
// Under the field: the optional „Говорете“ button (VoiceInput, W2-10) adds spoken text.

import { useEffect, useId, useRef } from "react";
import { fill } from "@/components/family/format";
import { Button } from "@/components/ui/Button";
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
    <section className="check-step">
      <h1 className="check-heading">
        <label htmlFor={fieldId}>{bg.protectedCheck.textLabel}</label>
      </h1>
      <p id={hintId} className="muted">
        {bg.protectedCheck.textHint}
      </p>
      <textarea
        id={fieldId}
        ref={field}
        className="check-text"
        rows={5}
        maxLength={MAX_TEXT_LENGTH}
        value={text}
        onChange={(event) => onTextChange(event.target.value)}
        aria-describedby={`${hintId} ${counterId}`}
        disabled={sending}
      />
      <p id={counterId} className="check-counter">
        {fill(bg.protectedCheck.textCounter, { count: text.length, max: MAX_TEXT_LENGTH })}
      </p>
      <VoiceInput
        enabled={voiceEnabled}
        disabled={sending}
        onSpoken={(spoken) => onTextChange(appendSpoken(text, spoken, MAX_TEXT_LENGTH))}
      />
      {sending ? (
        <p role="status" className="check-sending">
          {bg.protectedCheck.checking}
        </p>
      ) : null}
      <div className="check-nav">
        <Button variant="secondary" onClick={() => onSubmit("")} disabled={sending}>
          {bg.protectedCheck.skip}
        </Button>
        <Button onClick={() => onSubmit(text)} disabled={sending}>
          {bg.protectedCheck.check}
        </Button>
      </div>
      <Button variant="secondary" onClick={onBack} disabled={sending}>
        <span aria-hidden="true">← </span>
        {bg.protectedCheck.back}
      </Button>
    </section>
  );
}
