// The form „Добавяне на човек“ (/family/new): name + district -> POST /api/persons.
// The input is checked in the browser with the SAME Zod schema the API uses
// (CreatePersonSchema), so the person sees the Bulgarian message at once; the API
// checks it again (never trust the client). On success we open the new person's page.
//
// Look (Redesign v3 Phase 4, family.css): two numbered steps on a rail (1 the name,
// 2 the district), a progress halo at the top that fills as each step becomes valid
// (checked with the same schema fields), the submit button as the last stop, and next
// to it (under it on a phone) a live preview of the fridge card with the typed name.
// Both steps stay on one page: the error of either field is shown at once, and the
// keyboard order is the plain order of the fields.
"use client";

import { Check } from "lucide-react";
import { useRouter } from "next/navigation";
import { useId, useRef, useState, type FormEvent } from "react";
import { ROUTES } from "@/config/routes";
import { Button } from "@/components/ui/Button";
import { bg } from "@/i18n/bg";
import { CreatePersonSchema } from "@/schemas/persons";
import { callApi, type PersonDto } from "./api";
import { FormMessage, SelectField, TextField, type FormNotice } from "./fields";
import { districtName, districtOptions, fill } from "./format";
import { QrCode } from "./QrCode";

// What the preview's small QR code holds: our pairing page, like the printed card.
const PREVIEW_QR = `https://scamly-ag777.vercel.app${ROUTES.pair}`;

export function CreatePersonForm() {
  const router = useRouter();
  const errorId = useId();
  const [notice, setNotice] = useState<FormNotice>(null);
  const [invalidField, setInvalidField] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  // What is typed right now, only for the progress halo and the live preview (the
  // form is still read with FormData when it is sent).
  const [name, setName] = useState("");
  const [district, setDistrict] = useState("");
  // A ref changes at once (no re-render needed), so a double click sends only one request.
  const inFlight = useRef(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (inFlight.current) return;
    // FormData -> plain object, like Python's dict(form.items()).
    const values = Object.fromEntries(new FormData(event.currentTarget));
    const input = CreatePersonSchema.safeParse(values);
    if (!input.success) {
      const issue = input.error.issues[0];
      setInvalidField(typeof issue?.path[0] === "string" ? issue.path[0] : null);
      setNotice({ kind: "error", text: issue?.message ?? bg.errors.validation });
      return;
    }

    inFlight.current = true;
    setPending(true);
    setNotice(null);
    setInvalidField(null);
    const result = await callApi<{ person: PersonDto }>("/api/persons", "POST", input.data);
    if (result.ok) {
      // Stay "pending" while the next page opens.
      router.push(`${ROUTES.family}/${result.data.person.id}`);
      return;
    }
    inFlight.current = false;
    setPending(false);
    setNotice({ kind: "error", text: result.messageBg });
  }

  // A step is done when its field passes the same rule the API uses.
  const nameDone = CreatePersonSchema.shape.displayName.safeParse(name).success;
  const districtDone = CreatePersonSchema.shape.districtCode.safeParse(district).success;
  const done = (nameDone ? 1 : 0) + (districtDone ? 1 : 0);

  return (
    <div className="family-create">
      <form noValidate onSubmit={submit} aria-busy={pending} className="family-glass min-w-0">
        <ProgressHalo done={done} total={2} />
        <fieldset disabled={pending} className="family-steps min-w-0">
          <div className="family-step" data-done={nameDone}>
            <StepMark n={1} done={nameDone} />
            <div className="min-w-0 flex-1">
              <p className="family-step-title">{bg.family.stepName}</p>
              <TextField
                id="person-name"
                name="displayName"
                label={bg.family.nameLabel}
                hint={bg.family.nameHint}
                type="text"
                autoComplete="off"
                maxLength={60}
                required
                invalid={invalidField === "displayName"}
                errorId={errorId}
                onChange={(event) => setName(event.target.value)}
              />
            </div>
          </div>
          <div className="family-step" data-done={districtDone}>
            <StepMark n={2} done={districtDone} />
            <div className="min-w-0 flex-1">
              <p className="family-step-title">{bg.family.stepDistrict}</p>
              <SelectField
                id="person-district"
                name="districtCode"
                label={bg.family.district}
                hint={bg.family.districtHint}
                defaultValue=""
                required
                invalid={invalidField === "districtCode"}
                errorId={errorId}
                onChange={(event) => setDistrict(event.target.value)}
              >
                <option value="" disabled>
                  {bg.family.districtPlaceholder}
                </option>
                {districtOptions().map((option) => (
                  <option key={option.code} value={option.code}>
                    {option.name}
                  </option>
                ))}
              </SelectField>
            </div>
          </div>
          <div className="family-step family-step-last">
            <span className="family-step-mark family-step-mark-end" aria-hidden="true" />
            <div className="min-w-0 flex-1">
              <Button type="submit" size="lg" loading={pending}>
                {pending ? bg.family.saving : bg.family.createButton}
              </Button>
            </div>
          </div>
        </fieldset>
        <FormMessage notice={notice} id={errorId} />
      </form>
      <FridgePreview name={name.trim()} district={districtDone ? districtName(district) : null} />
    </div>
  );
}

// The number of a step in a small disc; a tick once the step is done.
function StepMark({ n, done }: { n: number; done: boolean }) {
  return (
    <span className="family-step-mark tabular font-mono" aria-hidden="true">
      {done ? <Check className="size-5" strokeWidth={2.5} /> : n}
    </span>
  );
}

// A ring that fills with the halo as the steps are done (SVG stroke-dasharray, the
// change is a CSS transition), with „Попълнени стъпки: 1 от 2“ next to it.
function ProgressHalo({ done, total }: { done: number; total: number }) {
  const share = done / total;
  return (
    <div className="family-progress">
      <svg viewBox="0 0 48 48" className="family-progress-ring" aria-hidden="true">
        <defs>
          <linearGradient id="family-progress-halo" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="var(--halo-1)" />
            <stop offset="55%" stopColor="var(--halo-2)" />
            <stop offset="100%" stopColor="var(--halo-3)" />
          </linearGradient>
        </defs>
        <circle cx="24" cy="24" r="19" className="family-progress-track" />
        <circle
          cx="24"
          cy="24"
          r="19"
          pathLength={100}
          className="family-progress-value"
          strokeDasharray={`${Math.max(share * 100, 0.01)} 100`}
        />
      </svg>
      <p className="text-sm font-semibold text-fg-muted">
        {fill(bg.family.createProgress, { n: done, total })}
      </p>
    </div>
  );
}

// A small copy of the fridge card (/karta-za-hladilnik) with the typed name on top:
// the same title and three steps, drawn as paper (always the light theme). Only a
// preview: the real card is printed from its own page.
function FridgePreview({ name, district }: { name: string; district: string | null }) {
  const card = bg.fridgeCard;
  return (
    <figure className="family-fridge-wrap">
      <figcaption className="mb-4">
        <p className="eyebrow">{bg.family.previewTitle}</p>
        <p className="mt-2 max-w-[42ch] text-sm text-fg-muted">{bg.family.previewHint}</p>
      </figcaption>
      <div className="family-fridge" data-theme="light">
        <p className="family-fridge-for">
          {name === "" ? bg.family.previewNobody : fill(bg.family.previewFor, { name })}
          {district === null ? null : <span className="text-fg-subtle"> · {district}</span>}
        </p>
        <p className="family-fridge-title">{card.title}</p>
        <ol className="family-fridge-steps">
          {card.steps.map((step, index) => (
            <li key={step}>
              <span className="tabular font-mono" aria-hidden="true">
                {index + 1}
              </span>
              <span>{step}</span>
            </li>
          ))}
        </ol>
        <p className="family-fridge-check">{card.check}</p>
        <div className="family-fridge-qr" aria-hidden="true">
          <QrCode text={PREVIEW_QR} label={card.qrLabel} />
          <p>{card.pairing}</p>
        </div>
      </div>
    </figure>
  );
}
