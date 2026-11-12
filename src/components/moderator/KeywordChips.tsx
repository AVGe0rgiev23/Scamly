// The extra keywords of a card as "chips" (W3-05): each stem is a small badge with an
// „×“ icon button to remove it, and a field + „Добави“ to add one. Every new stem is
// checked with the same rule the API uses (checkKeyword in src/schemas/scripts.ts), so a
// bad keyword is rejected at once with a Bulgarian message and never reaches the server.
"use client";

import { X } from "lucide-react";
import { useId, useState, type KeyboardEvent } from "react";
import { fill } from "@/components/family/format";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Field";
import { bg } from "@/i18n/bg";
import { checkKeyword, MAX_KEYWORDS } from "@/schemas/scripts";

type KeywordChipsProps = {
  keywords: string[];
  onChange: (keywords: string[]) => void;
  disabled: boolean;
};

export function KeywordChips({ keywords, onChange, disabled }: KeywordChipsProps) {
  const inputId = useId();
  const errorId = useId();
  const [typed, setTyped] = useState("");
  const [error, setError] = useState<string | null>(null);
  // Read aloud by screen readers after a chip is added or removed.
  const [announcement, setAnnouncement] = useState("");

  function add() {
    const result = checkKeyword(typed);
    if (!result.ok) {
      setError(result.messageBg);
      return;
    }
    if (keywords.includes(result.stem)) {
      setError(bg.moderator.keywordDuplicate);
      return;
    }
    if (keywords.length >= MAX_KEYWORDS) {
      setError(bg.scripts.keywordsTooMany);
      return;
    }
    onChange([...keywords, result.stem]);
    setTyped("");
    setError(null);
    setAnnouncement(fill(bg.moderator.keywordAdded, { stem: result.stem }));
  }

  function remove(stem: string) {
    onChange(keywords.filter((keyword) => keyword !== stem));
    setError(null);
    setAnnouncement(fill(bg.moderator.keywordRemoved, { stem }));
  }

  // Enter in the field adds the keyword instead of sending the whole form.
  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter") {
      event.preventDefault();
      add();
    }
  }

  return (
    <fieldset className="flex min-w-0 flex-col gap-3" disabled={disabled}>
      <legend className="mb-1.5 font-semibold text-fg">{bg.moderator.keywordsTitle}</legend>
      <p className="text-sm text-fg-muted">{bg.moderator.keywordsHelp}</p>
      {keywords.length === 0 ? (
        <p className="text-sm text-fg-subtle">{bg.moderator.keywordsEmpty}</p>
      ) : (
        <ul className="flex flex-wrap gap-2" aria-label={bg.moderator.keywordsTitle}>
          {keywords.map((stem) => (
            <li key={stem}>
              <Badge className="gap-0 py-0! pr-0 pl-3 text-sm text-fg">
                <span lang="bg" className="font-mono">
                  {stem}
                </span>
                {/* 44 px square: the whole right end of the chip is the tap area. */}
                <button
                  type="button"
                  className="pressable inline-flex size-11 cursor-pointer items-center justify-center rounded-sm text-fg-muted hover:text-fg disabled:cursor-not-allowed disabled:text-fg-subtle"
                  aria-label={fill(bg.moderator.keywordRemove, { stem })}
                  onClick={() => remove(stem)}
                >
                  <X className="size-4" aria-hidden="true" />
                </button>
              </Badge>
            </li>
          ))}
        </ul>
      )}
      <Field label={bg.moderator.keywordLabel} htmlFor={inputId} error={error} errorId={errorId}>
        <div className="flex gap-2">
          <Input
            id={inputId}
            type="text"
            mono
            className="min-w-0 flex-1"
            value={typed}
            autoComplete="off"
            maxLength={40}
            aria-invalid={error !== null || undefined}
            aria-describedby={error !== null ? errorId : undefined}
            onChange={(event) => {
              setTyped(event.target.value);
              setError(null);
            }}
            onKeyDown={onKeyDown}
          />
          <Button variant="secondary" className="shrink-0" onClick={add}>
            {bg.moderator.keywordAdd}
          </Button>
        </div>
      </Field>
      <p role="status" className="sr-only">
        {announcement}
      </p>
    </fieldset>
  );
}
