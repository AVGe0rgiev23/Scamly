// The extra keywords of a card as "chips" (W3-05): each stem with a „×“ button to
// remove it, and a field + „Добави“ to add one. Every new stem is checked with the
// same rule the API uses (checkKeyword in src/schemas/scripts.ts), so a bad keyword
// is rejected at once with a Bulgarian message and never reaches the server.
"use client";

import { useId, useState, type KeyboardEvent } from "react";
import { fill } from "@/components/family/format";
import { Button } from "@/components/ui/Button";
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
    <fieldset className="mod-keywords" disabled={disabled}>
      <legend>{bg.moderator.keywordsTitle}</legend>
      <p className="muted">{bg.moderator.keywordsHelp}</p>
      {keywords.length === 0 ? (
        <p className="muted">{bg.moderator.keywordsEmpty}</p>
      ) : (
        <ul className="mod-chips" aria-label={bg.moderator.keywordsTitle}>
          {keywords.map((stem) => (
            <li key={stem} className="mod-chip">
              <span lang="bg">{stem}</span>
              <button
                type="button"
                className="mod-chip-remove"
                aria-label={fill(bg.moderator.keywordRemove, { stem })}
                onClick={() => remove(stem)}
              >
                <span aria-hidden="true">×</span>
              </button>
            </li>
          ))}
        </ul>
      )}
      <div className="form-field">
        <label htmlFor={inputId}>{bg.moderator.keywordLabel}</label>
        <div className="mod-keyword-add">
          <input
            id={inputId}
            type="text"
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
          <Button variant="secondary" onClick={add}>
            {bg.moderator.keywordAdd}
          </Button>
        </div>
        {error !== null ? (
          <p id={errorId} role="alert" className="form-message form-message-error">
            {error}
          </p>
        ) : null}
      </div>
      <p role="status" className="sr-only">
        {announcement}
      </p>
    </fieldset>
  );
}
