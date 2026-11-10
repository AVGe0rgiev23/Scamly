// The public report form „Подай сигнал за измама“ on /signal (W3-02). Anyone, no login.
// Sends POST /api/reports and then shows „Благодарим!“. The browser checks the fields
// first with the same Zod rules as the server (checkReport), so every problem is shown
// at once next to its field; the server checks everything again (never trust the client).
//
// The hidden `website` field is a honeypot: people never see it or reach it with Tab,
// so it stays empty; simple bots fill in every field. The server then silently drops
// the report.
"use client";

import Link from "next/link";
import { useEffect, useRef, useState, useSyncExternalStore, type FormEvent } from "react";
import { fill } from "@/components/family/format";
import { FormMessage, SelectField, TextField, type FormNotice } from "@/components/family/fields";
import { BigChoice } from "@/components/ui/BigChoice";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ROUTES } from "@/config/routes";
import { bg } from "@/i18n/bg";
import { DISTRICT_CODES, MAX_DESCRIPTION_LENGTH, todayInBulgaria } from "@/schemas/reports";
import {
  checkReport,
  errorsFromApi,
  firstInvalidField,
  oldestReportDay,
  reportBody,
  SCRIPT_CHOICES,
  type FieldErrors,
  type ReportField,
  type ReportValues,
} from "./reportForm";

// The id of each field's input (one form per page, so fixed ids are enough).
const IDS: Record<ReportField | "website", string> = {
  districtCode: "report-district",
  scriptType: "report-script",
  occurredOn: "report-date",
  description: "report-description",
  callerNumber: "report-caller",
  website: "report-website",
};
const ERROR_ID = "report-error";

const EMPTY: ReportValues = {
  districtCode: "",
  scriptType: "",
  occurredOn: "", // "" = today (filled in when the page is in the browser)
  description: "",
  callerNumber: "",
  website: "",
};

// Today in Bulgaria, read only in the browser ("" while the page is built on the
// server, so the static page never has a frozen date in it).
function noChanges() {
  return () => {};
}
function useToday(): string {
  return useSyncExternalStore(
    noChanges,
    () => todayInBulgaria(new Date()),
    () => "",
  );
}

// Puts the keyboard focus on a field (for the big choice: on its chosen or first answer).
function focusField(field: ReportField) {
  if (field === "scriptType") {
    const group = document.getElementById(IDS.scriptType);
    const radio =
      group?.querySelector<HTMLInputElement>("input:checked") ??
      group?.querySelector<HTMLInputElement>("input");
    radio?.focus();
    return;
  }
  document.getElementById(IDS[field])?.focus();
}

// The red message under a field. Its id is in the field's aria-describedby.
function FieldError({ field, errors }: { field: ReportField; errors: FieldErrors }) {
  const message = errors[field];
  if (message === undefined) return null;
  return (
    <p id={`${IDS[field]}-error`} className="report-field-error">
      {message}
    </p>
  );
}

// The answer of the API, read safely (it may not even be JSON).
type SendResult =
  { kind: "ok" } | { kind: "fields"; errors: FieldErrors } | { kind: "error"; text: string };

async function sendReport(values: ReportValues): Promise<SendResult> {
  let response: Response;
  try {
    response = await fetch("/api/reports", {
      method: "POST",
      credentials: "same-origin",
      cache: "no-store",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(reportBody(values)),
    });
  } catch {
    return { kind: "error", text: bg.reportForm.networkError };
  }
  if (response.status === 201) return { kind: "ok" };
  if (response.status === 429) return { kind: "error", text: bg.reportForm.rateLimited };

  let body: unknown = null;
  try {
    body = await response.json();
  } catch {
    body = null; // not JSON (e.g. a proxy error page)
  }
  // { error: { messageBg, fields? } }: read step by step, like dict.get() in Python.
  const error =
    typeof body === "object" && body !== null && "error" in body ? (body.error as unknown) : null;
  const details =
    typeof error === "object" && error !== null ? (error as Record<string, unknown>) : {};
  const messageBg = typeof details.messageBg === "string" ? details.messageBg : bg.errors.internal;
  const errors = response.status === 400 ? errorsFromApi(details.fields, messageBg) : {};
  if (firstInvalidField(errors) !== null) return { kind: "fields", errors };
  return { kind: "error", text: messageBg };
}

export function ReportForm() {
  const today = useToday();
  const [values, setValues] = useState<ReportValues>(EMPTY);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [notice, setNotice] = useState<FormNotice>(null);
  const [pending, setPending] = useState(false);
  const [sent, setSent] = useState(false);
  // A ref changes at once, so a double tap can't send the report twice.
  const inFlight = useRef(false);
  const successHeading = useRef<HTMLHeadingElement>(null);

  // The field to focus after the errors are on the screen (null = none).
  const focusNext = useRef<ReportField | null>(null);

  // After sending: the focus goes to „Благодарим!“, so it is read aloud.
  useEffect(() => {
    if (sent) successHeading.current?.focus();
  }, [sent]);

  // New field errors: the focus goes to the first wrong field, whose label and error
  // message are then read aloud together.
  useEffect(() => {
    if (focusNext.current !== null) {
      focusField(focusNext.current);
      focusNext.current = null;
    }
  }, [errors]);

  // The date shown: what the person chose, or today.
  const occurredOn = values.occurredOn === "" ? today : values.occurredOn;

  // Changes one field and clears its old error (like dict | {key: value} in Python).
  function change(field: keyof ReportValues, value: string) {
    setValues((old) => ({ ...old, [field]: value }));
    if (field !== "website" && errors[field] !== undefined) {
      setErrors((old) => ({ ...old, [field]: undefined }));
    }
  }

  // aria-describedby of a field: its hint (if any) and its error (if any).
  function describedBy(field: ReportField, hasHint: boolean): string | undefined {
    const ids = [
      hasHint ? `${IDS[field]}-hint` : null,
      errors[field] !== undefined ? `${IDS[field]}-error` : null,
    ].filter(Boolean);
    return ids.length > 0 ? ids.join(" ") : undefined;
  }

  function showFieldErrors(found: FieldErrors) {
    focusNext.current = firstInvalidField(found);
    setNotice(null);
    setErrors(found);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (inFlight.current) return;
    const filled: ReportValues = {
      ...values,
      occurredOn: values.occurredOn === "" ? todayInBulgaria(new Date()) : values.occurredOn,
    };
    const found = checkReport(filled, todayInBulgaria(new Date()));
    if (firstInvalidField(found) !== null) {
      showFieldErrors(found);
      return;
    }

    inFlight.current = true;
    setPending(true);
    setErrors({});
    setNotice(null);
    const result = await sendReport(filled);
    inFlight.current = false;
    setPending(false);
    if (result.kind === "ok") {
      setSent(true);
    } else if (result.kind === "fields") {
      showFieldErrors(result.errors);
    } else {
      setNotice({ kind: "error", text: result.text });
    }
  }

  function startAgain() {
    setValues(EMPTY);
    setErrors({});
    setNotice(null);
    setSent(false);
  }

  if (sent) {
    return (
      <Card className="report-success" role="status">
        <h2 ref={successHeading} tabIndex={-1}>
          {bg.reportForm.successTitle}
        </h2>
        <p>{bg.reportForm.successText}</p>
        <div className="report-actions">
          <Link href={ROUTES.education} className="button button-primary">
            {bg.reportForm.successEducation}
          </Link>
          <Link href={ROUTES.home} className="button button-secondary">
            {bg.reportForm.successHome}
          </Link>
          <Button variant="secondary" onClick={startAgain}>
            {bg.reportForm.another}
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <form
      noValidate
      onSubmit={submit}
      aria-label={bg.reportForm.formLabel}
      aria-busy={pending}
      className="card report-form"
    >
      <fieldset disabled={pending}>
        <div className="report-field">
          <SelectField
            id={IDS.districtCode}
            name="districtCode"
            label={bg.reportForm.district}
            value={values.districtCode}
            onChange={(event) => change("districtCode", event.target.value)}
            invalid={errors.districtCode !== undefined}
            errorId={`${IDS.districtCode}-error`}
          >
            <option value="">{bg.reportForm.districtPlaceholder}</option>
            {DISTRICT_CODES.map((code) => (
              <option key={code} value={code}>
                {bg.districts[code]}
              </option>
            ))}
          </SelectField>
          <FieldError field="districtCode" errors={errors} />
        </div>

        <div id={IDS.scriptType} className="report-field">
          <BigChoice
            question={bg.reportForm.scriptQuestion}
            value={values.scriptType === "" ? null : values.scriptType}
            onChange={(value) => change("scriptType", value)}
            options={SCRIPT_CHOICES}
            size="large"
            describedBy={describedBy("scriptType", false)}
          />
          <FieldError field="scriptType" errors={errors} />
        </div>

        <div className="report-field">
          <TextField
            id={IDS.occurredOn}
            name="occurredOn"
            type="date"
            label={bg.reportForm.date}
            hint={bg.reportForm.dateHint}
            value={occurredOn}
            max={today || undefined}
            min={today ? oldestReportDay(today) : undefined}
            onChange={(event) => change("occurredOn", event.target.value)}
            invalid={errors.occurredOn !== undefined}
            errorId={`${IDS.occurredOn}-error`}
          />
          <FieldError field="occurredOn" errors={errors} />
        </div>

        <div className="report-field">
          <div className="form-field">
            <label htmlFor={IDS.description}>{bg.reportForm.description}</label>
            <textarea
              id={IDS.description}
              name="description"
              rows={5}
              maxLength={MAX_DESCRIPTION_LENGTH}
              value={values.description}
              onChange={(event) => change("description", event.target.value)}
              aria-invalid={errors.description !== undefined || undefined}
              aria-describedby={[
                `${IDS.description}-hint`,
                `${IDS.description}-counter`,
                errors.description !== undefined ? `${IDS.description}-error` : null,
              ]
                .filter(Boolean)
                .join(" ")}
            />
            <p id={`${IDS.description}-hint`} className="muted">
              {bg.reportForm.descriptionHint}
            </p>
            <p id={`${IDS.description}-counter`} className="muted report-counter">
              {fill(bg.reportForm.descriptionCounter, {
                count: values.description.length,
                max: MAX_DESCRIPTION_LENGTH,
              })}
            </p>
          </div>
          <FieldError field="description" errors={errors} />
        </div>

        <div className="report-field">
          <TextField
            id={IDS.callerNumber}
            name="callerNumber"
            type="tel"
            inputMode="tel"
            autoComplete="off"
            label={bg.reportForm.callerNumber}
            hint={bg.reportForm.callerNumberHint}
            value={values.callerNumber}
            onChange={(event) => change("callerNumber", event.target.value)}
            invalid={errors.callerNumber !== undefined}
            errorId={`${IDS.callerNumber}-error`}
          />
          <FieldError field="callerNumber" errors={errors} />
        </div>

        {/* The honeypot: moved off the screen (not display:none, which some bots
            skip), out of the Tab order and hidden from screen readers. */}
        <div className="report-trap" aria-hidden="true">
          <label htmlFor={IDS.website}>{bg.reportForm.honeypot}</label>
          <input
            id={IDS.website}
            name="website"
            type="text"
            tabIndex={-1}
            autoComplete="off"
            value={values.website}
            onChange={(event) => change("website", event.target.value)}
          />
        </div>

        {/* Field errors: a short note here, the messages under the fields. */}
        {firstInvalidField(errors) !== null ? (
          <p className="form-message form-message-error">{bg.reportForm.fixErrors}</p>
        ) : null}
        {/* Other errors (no connection, too many reports): announced and focused. */}
        <FormMessage notice={notice} id={ERROR_ID} />
        {pending ? (
          <p role="status" className="report-sending">
            {bg.reportForm.sending}
          </p>
        ) : null}
        <Button type="submit" className="report-submit">
          {bg.reportForm.submit}
        </Button>
      </fieldset>
    </form>
  );
}
