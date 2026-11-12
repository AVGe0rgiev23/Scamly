// The form „Добавяне на човек“ (/family/new): name + district -> POST /api/persons.
// The input is checked in the browser with the SAME Zod schema the API uses
// (CreatePersonSchema), so the person sees the Bulgarian message at once; the API
// checks it again (never trust the client). On success we open the new person's page.
// One column of fields; the submit button is the only primary button of the page.
"use client";

import { useRouter } from "next/navigation";
import { useId, useRef, useState, type FormEvent } from "react";
import { ROUTES } from "@/config/routes";
import { Button } from "@/components/ui/Button";
import { bg } from "@/i18n/bg";
import { CreatePersonSchema } from "@/schemas/persons";
import { callApi, type PersonDto } from "./api";
import { FormMessage, SelectField, TextField, type FormNotice } from "./fields";
import { districtOptions } from "./format";

export function CreatePersonForm() {
  const router = useRouter();
  const errorId = useId();
  const [notice, setNotice] = useState<FormNotice>(null);
  const [invalidField, setInvalidField] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
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

  return (
    <form noValidate onSubmit={submit} aria-busy={pending} className="flex flex-col gap-6">
      <fieldset disabled={pending} className="flex min-w-0 flex-col gap-6">
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
        />
        <SelectField
          id="person-district"
          name="districtCode"
          label={bg.family.district}
          hint={bg.family.districtHint}
          defaultValue=""
          required
          invalid={invalidField === "districtCode"}
          errorId={errorId}
        >
          <option value="" disabled>
            {bg.family.districtPlaceholder}
          </option>
          {districtOptions().map((district) => (
            <option key={district.code} value={district.code}>
              {district.name}
            </option>
          ))}
        </SelectField>
        <div>
          <Button type="submit" loading={pending}>
            {pending ? bg.family.saving : bg.family.createButton}
          </Button>
        </div>
      </fieldset>
      <FormMessage notice={notice} id={errorId} />
    </form>
  );
}
