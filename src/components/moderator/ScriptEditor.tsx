// The form „Нова схема“ / „Редактиране на схема“ (W3-05): every field of an education
// card, the keyword chips, the „Публикувана“ switch and „Запази“. One column (max
// 44 rem) of design-system fields, sections split by hairlines; „Запази“ is the only
// primary button.
//
//   new card  -> POST  /api/scripts      with all fields
//   edit card -> PATCH /api/scripts/:id  with ONLY the changed fields (changedFields)
//
// The input is checked in the browser with the SAME Zod schemas the API uses
// (ScriptSchema, ScriptPatchSchema), so the moderator sees the Bulgarian message at
// once; the API checks it again (never trust the client) and its Bulgarian errors
// (e.g. „Вече има схема с този адрес“) are shown here as they are.
"use client";

import { ArrowLeft, ArrowUpRight } from "lucide-react";
import Link from "next/link";
import { useEffect, useId, useRef, useState, type FormEvent, type ReactNode } from "react";
import { callApi } from "@/components/family/api";
import { FormMessage, SelectField, TextField, type FormNotice } from "@/components/family/fields";
import { fill } from "@/components/family/format";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Field, Textarea } from "@/components/ui/Field";
import { Skeleton } from "@/components/ui/Skeleton";
import { ErrorState } from "@/components/ui/States";
import { Switch } from "@/components/ui/Toggle";
import { ROUTES } from "@/config/routes";
import { SCRIPT_TYPES, type ScriptType } from "@/engine";
import { bg } from "@/i18n/bg";
import {
  MAX_SCRIPT_TEXT_LENGTH,
  MAX_TITLE_LENGTH,
  ScriptPatchSchema,
  ScriptSchema,
  type ScriptDto,
} from "@/schemas/scripts";
import { KeywordChips } from "./KeywordChips";
import { BACK_LINK } from "./ModeratorFrame";
import { changedFields, draftFromScript, EMPTY_DRAFT, type ScriptDraft } from "./scriptForm";

type ScriptEditorProps = {
  scriptId: string | null; // null = a new card
  basePath?: string; // where the editor pages are; the preview passes its own
};

// Loading the card to edit (a new card needs nothing).
type LoadState = { kind: "loading" } | { kind: "error"; message: string } | { kind: "ready" };

// The three long texts of a card: field name, label and optional hint.
const TEXT_FIELDS: {
  name: "howItStartsBg" | "whatTheySayBg" | "whatToDoBg";
  label: string;
  hint?: string;
}[] = [
  { name: "howItStartsBg", label: bg.moderator.howItStartsLabel },
  {
    name: "whatTheySayBg",
    label: bg.moderator.whatTheySayLabel,
    hint: bg.moderator.whatTheySayHint,
  },
  { name: "whatToDoBg", label: bg.moderator.whatToDoLabel, hint: bg.moderator.whatToDoHint },
];

export function ScriptEditor({ scriptId, basePath = ROUTES.moderatorScripts }: ScriptEditorProps) {
  const errorId = useId();
  const [id, setId] = useState<string | null>(scriptId);
  const [load, setLoad] = useState<LoadState>(
    scriptId === null ? { kind: "ready" } : { kind: "loading" },
  );
  const [attempt, setAttempt] = useState(0);
  const [saved, setSaved] = useState<ScriptDraft | null>(null); // the card as stored now
  const [draft, setDraft] = useState<ScriptDraft>(EMPTY_DRAFT);
  const [notice, setNotice] = useState<FormNotice>(null);
  const [invalidField, setInvalidField] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const inFlight = useRef(false); // a double click sends only one request

  useEffect(() => {
    if (scriptId === null) return;
    let active = true;
    async function loadScript(cardId: string) {
      const result = await callApi<{ script: ScriptDto }>(`/api/scripts/${cardId}`);
      if (!active) return;
      if (!result.ok) {
        setLoad({ kind: "error", message: result.messageBg });
        return;
      }
      const loaded = draftFromScript(result.data.script);
      setSaved(loaded);
      setDraft(loaded);
      setLoad({ kind: "ready" });
    }
    void loadScript(scriptId);
    return () => {
      active = false;
    };
  }, [scriptId, attempt]);

  // Changes one field of the draft, like dataclasses.replace(draft, field=value).
  function update<K extends keyof ScriptDraft>(field: K, value: ScriptDraft[K]) {
    setDraft((current) => ({ ...current, [field]: value }));
  }

  // Shows a Zod problem: the message, and marks its field (aria-invalid).
  function showProblem(issue: { path: PropertyKey[]; message: string } | undefined) {
    const field = issue?.path[0];
    setInvalidField(typeof field === "string" ? field : null);
    setNotice({ kind: "error", text: issue?.message ?? bg.errors.validation });
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (inFlight.current) return;

    // What to send: everything for a new card, only the changes for an existing one.
    let request: { url: string; method: "POST" | "PATCH"; body: unknown };
    if (id === null || saved === null) {
      const input = ScriptSchema.safeParse(draft);
      if (!input.success) return showProblem(input.error.issues[0]);
      request = { url: "/api/scripts", method: "POST", body: input.data };
    } else {
      const changes = changedFields(saved, draft);
      const patch = ScriptPatchSchema.safeParse(changes);
      if (!patch.success) return showProblem(patch.error.issues[0]);
      request = { url: `/api/scripts/${id}`, method: "PATCH", body: patch.data };
    }

    inFlight.current = true;
    setPending(true);
    setNotice(null);
    setInvalidField(null);
    const result = await callApi<{ script: ScriptDto }>(request.url, request.method, request.body);
    inFlight.current = false;
    setPending(false);
    if (!result.ok) {
      setNotice({ kind: "error", text: result.messageBg });
      return;
    }
    const stored = draftFromScript(result.data.script);
    setSaved(stored);
    setDraft(stored);
    if (id === null) {
      // The new card now has an address of its own: show it in the address bar, so a
      // reload opens this card for editing (Next.js supports history.replaceState).
      setId(result.data.script.id);
      window.history.replaceState(null, "", `${basePath}/${result.data.script.id}`);
      setNotice({ kind: "success", text: bg.moderator.created });
    } else {
      setNotice({ kind: "success", text: bg.moderator.saved });
    }
  }

  return (
    <>
      <Link href={basePath} className={BACK_LINK}>
        <ArrowLeft className="size-5" aria-hidden="true" />
        {bg.moderator.backToList}
      </Link>
      <header className="mb-10 flex max-w-[44rem] flex-col items-start gap-4">
        <h1 className="text-h1">{id === null ? bg.moderator.newTitle : bg.moderator.editTitle}</h1>
        {saved?.published ? (
          <ButtonLink href={`${ROUTES.education}/${saved.slug}`} variant="secondary" size="sm">
            {bg.moderator.viewPublic}
            <ArrowUpRight className="size-5" aria-hidden="true" />
          </ButtonLink>
        ) : null}
      </header>

      {load.kind === "loading" ? (
        <div className="max-w-[44rem]">
          <p role="status" className="sr-only">
            {bg.common.loading}
          </p>
          {/* The shape of the form: a few labels with their fields. */}
          <div className="flex flex-col gap-8" aria-hidden="true">
            {["h-12", "h-12", "h-12", "h-36", "h-36"].map((height, index) => (
              <div key={index} className="flex flex-col gap-2">
                <Skeleton className="h-5 w-40" />
                <Skeleton className={height} />
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {load.kind === "error" ? (
        <ErrorState
          className="max-w-[44rem]"
          text={load.message}
          retryLabel={bg.moderator.retry}
          onRetry={() => {
            setLoad({ kind: "loading" });
            setAttempt(attempt + 1);
          }}
        />
      ) : null}

      {load.kind === "ready" ? (
        <form
          noValidate
          onSubmit={submit}
          aria-busy={pending}
          className="flex max-w-[44rem] flex-col gap-6 border-t border-line pt-8"
        >
          <fieldset disabled={pending} className="flex min-w-0 flex-col gap-8">
            <TextField
              id="script-title"
              label={bg.moderator.titleLabel}
              hint={bg.moderator.titleHint}
              type="text"
              autoComplete="off"
              maxLength={MAX_TITLE_LENGTH}
              value={draft.titleBg}
              onChange={(event) => update("titleBg", event.target.value)}
              invalid={invalidField === "titleBg"}
              errorId={errorId}
            />
            <div className="grid gap-8 sm:grid-cols-2 sm:gap-6">
              <SelectField
                id="script-type"
                label={bg.moderator.typeLabel}
                value={draft.scriptType}
                onChange={(event) => update("scriptType", event.target.value as ScriptType)}
                invalid={invalidField === "scriptType"}
                errorId={errorId}
              >
                {SCRIPT_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {bg.scripts.typeNames[type]}
                  </option>
                ))}
              </SelectField>
              <TextField
                id="script-slug"
                label={bg.moderator.slugLabel}
                hint={fill(bg.moderator.slugHint, { slug: draft.slug || "…" })}
                type="text"
                mono
                autoComplete="off"
                autoCapitalize="none"
                spellCheck={false}
                maxLength={60}
                value={draft.slug}
                onChange={(event) => update("slug", event.target.value)}
                invalid={invalidField === "slug"}
                errorId={errorId}
              />
            </div>
            {TEXT_FIELDS.map((field) => (
              <TextAreaField
                key={field.name}
                id={`script-${field.name}`}
                label={field.label}
                hint={field.hint}
                value={draft[field.name]}
                onChange={(value) => update(field.name, value)}
                invalid={invalidField === field.name}
                errorId={errorId}
              />
            ))}
            <div className="border-t border-line pt-8">
              <KeywordChips
                keywords={draft.extraKeywords}
                onChange={(keywords) => update("extraKeywords", keywords)}
                disabled={pending}
              />
            </div>
            <div className="border-t border-line pt-6">
              <Switch
                id="script-published"
                label={bg.moderator.publishedLabel}
                checked={draft.published}
                onChange={(event) => update("published", event.target.checked)}
                aria-describedby="script-published-hint"
              />
              <p id="script-published-hint" className="ml-15 text-sm text-fg-muted">
                {bg.moderator.publishedHint}
              </p>
            </div>
            <Button type="submit" loading={pending} className="self-start">
              {pending ? bg.moderator.saving : bg.moderator.save}
            </Button>
          </fieldset>
          <FormMessage notice={notice} id={errorId} />
        </form>
      ) : null}
    </>
  );
}

// A long text with a label, an optional hint and a „123 от 1500 знака“ counter.
function TextAreaField(props: {
  id: string;
  label: string;
  hint?: string;
  value: string;
  onChange: (value: string) => void;
  invalid: boolean;
  errorId: string;
}): ReactNode {
  const counterId = `${props.id}-count`;
  const describedBy = [
    props.hint ? `${props.id}-hint` : null,
    counterId,
    props.invalid ? props.errorId : null,
  ]
    .filter(Boolean)
    .join(" ");
  return (
    <Field label={props.label} htmlFor={props.id} hint={props.hint} hintId={`${props.id}-hint`}>
      <Textarea
        id={props.id}
        rows={5}
        maxLength={MAX_SCRIPT_TEXT_LENGTH}
        value={props.value}
        onChange={(event) => props.onChange(event.target.value)}
        aria-invalid={props.invalid || undefined}
        aria-describedby={describedBy}
      />
      <p id={counterId} className="tabular text-right font-mono text-xs text-fg-subtle">
        {fill(bg.moderator.charCount, { count: props.value.length, max: MAX_SCRIPT_TEXT_LENGTH })}
      </p>
    </Field>
  );
}
