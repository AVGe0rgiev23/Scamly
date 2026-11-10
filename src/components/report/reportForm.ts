// Pure helpers of the public report form /signal (W3-02): the fields, the request
// body for POST /api/reports, and the Bulgarian error message of each field. No React
// here, so the unit tests (reportForm.test.ts) can check them without a browser.

import { SCRIPT_TYPES, type ScriptType } from "@/engine";
import { bg } from "@/i18n/bg";
import { addDays, MAX_REPORT_AGE_DAYS, createReportSchema } from "@/schemas/reports";

// The fields a person fills in, in the order they appear on the form.
export const REPORT_FIELDS = [
  "districtCode",
  "scriptType",
  "occurredOn",
  "description",
  "callerNumber",
] as const;
// "one of the names above", like Literal["districtCode", …] in Python.
export type ReportField = (typeof REPORT_FIELDS)[number];

// What the form holds while the person types (all text, like the inputs themselves).
export type ReportValues = {
  districtCode: string;
  scriptType: string;
  occurredOn: string;
  description: string;
  callerNumber: string;
  website: string; // the honeypot: empty for people
};

// The error message of each field that has one (a dict field -> message).
export type FieldErrors = Partial<Record<ReportField, string>>;

// The message for a field the API named without its own text (only the first
// problem's text comes back; see handleApiError).
const DEFAULT_MESSAGES: Record<ReportField, string> = {
  districtCode: bg.reports.districtInvalid,
  scriptType: bg.reports.scriptInvalid,
  occurredOn: bg.reports.dateInvalid,
  description: bg.reports.descriptionTooLong,
  callerNumber: bg.reports.callerNumberInvalid,
};

// The answers of „Каква беше измамата?“, in the order of the engine's script types.
export const SCRIPT_CHOICES: { value: ScriptType; label: string }[] = SCRIPT_TYPES.map((type) => ({
  value: type,
  label: bg.reportForm.scriptOptions[type],
}));

// The earliest day the date field allows (90 days back), for the input's `min`.
export function oldestReportDay(today: string): string {
  return addDays(today, -MAX_REPORT_AGE_DAYS);
}

function isReportField(value: unknown): value is ReportField {
  return typeof value === "string" && (REPORT_FIELDS as readonly string[]).includes(value);
}

// The body of POST /api/reports, exactly as typed: the server checks and cleans it
// again. The honeypot is sent as it is ("" for a person), so the server can tell.
export function reportBody(values: ReportValues) {
  return {
    districtCode: values.districtCode,
    scriptType: values.scriptType,
    occurredOn: values.occurredOn,
    description: values.description,
    callerNumber: values.callerNumber,
    website: values.website,
  };
}

// Checks the form in the browser with the SAME rules as the server
// (createReportSchema), so the person sees every problem at once, in Bulgarian.
// Returns {} when all is fine.
export function checkReport(values: ReportValues, today: string): FieldErrors {
  const result = createReportSchema(today).safeParse(reportBody(values));
  if (result.success) return {};
  const errors: FieldErrors = {};
  for (const issue of result.error.issues) {
    const field = issue.path[0];
    // Only the first message per field (e.g. "date in the future" before "too old").
    if (isReportField(field) && errors[field] === undefined) {
      errors[field] = issue.message;
    }
  }
  return errors;
}

// A 400 answer of the API: { error: { messageBg, fields: ["occurredOn", …] } }.
// The message belongs to the first field; the other fields get their usual message.
export function errorsFromApi(fields: unknown, messageBg: string): FieldErrors {
  const errors: FieldErrors = {};
  if (!Array.isArray(fields)) return errors;
  for (const field of fields) {
    if (isReportField(field) && errors[field] === undefined) {
      errors[field] = Object.keys(errors).length === 0 ? messageBg : DEFAULT_MESSAGES[field];
    }
  }
  return errors;
}

// The first field with an error, in the order of the form (to put the focus there).
export function firstInvalidField(errors: FieldErrors): ReportField | null {
  return REPORT_FIELDS.find((field) => errors[field] !== undefined) ?? null;
}
