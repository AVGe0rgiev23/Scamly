// „Име и област“ (owner only): rename the person or change the district
// (PATCH /api/persons/:id), and delete the person with all their data
// (DELETE /api/persons/:id) after a clear „Да изтрием ли…?“ window.
// Look: one column of fields; the delete part sits at the bottom behind a hairline,
// its trigger is a secondary button and only the button inside the window is red.
"use client";

import { useRouter } from "next/navigation";
import { useId, useState, type FormEvent } from "react";
import { ROUTES } from "@/config/routes";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/Dialog";
import { bg } from "@/i18n/bg";
import { UpdatePersonSchema } from "@/schemas/persons";
import { callApi, type PersonDto } from "./api";
import { FormMessage, SelectField, TextField, type FormNotice } from "./fields";
import { districtOptions, fill } from "./format";

type PersonSettingsProps = {
  person: PersonDto;
  onUpdated: (person: PersonDto) => void;
};

export function PersonSettings({ person, onUpdated }: PersonSettingsProps) {
  const router = useRouter();
  const errorId = useId();
  const [notice, setNotice] = useState<FormNotice>(null);
  const [invalidField, setInvalidField] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    const values = Object.fromEntries(new FormData(event.currentTarget));
    const input = UpdatePersonSchema.safeParse(values);
    if (!input.success) {
      const issue = input.error.issues[0];
      setInvalidField(typeof issue?.path[0] === "string" ? issue.path[0] : null);
      setNotice({ kind: "error", text: issue?.message ?? bg.errors.validation });
      return;
    }
    setPending(true);
    setNotice(null);
    setInvalidField(null);
    const result = await callApi<{ person: PersonDto }>(
      `/api/persons/${person.id}`,
      "PATCH",
      input.data,
    );
    setPending(false);
    if (!result.ok) {
      setNotice({ kind: "error", text: result.messageBg });
      return;
    }
    onUpdated(result.data.person);
    setNotice({ kind: "success", text: bg.family.changesSaved });
  }

  async function confirmDelete() {
    setDeleting(true);
    setDeleteError(null);
    const result = await callApi<{ ok: true }>(`/api/persons/${person.id}`, "DELETE");
    if (!result.ok) {
      setDeleting(false);
      setDeleteError(result.messageBg);
      return;
    }
    // The person is gone: back to the list (the dialog closes with this page).
    router.push(ROUTES.family);
  }

  return (
    <>
      <form noValidate onSubmit={save} aria-busy={pending} className="flex flex-col gap-4">
        <fieldset disabled={pending} className="flex min-w-0 flex-col gap-5">
          <TextField
            id="settings-name"
            name="displayName"
            label={bg.family.nameLabel}
            defaultValue={person.displayName}
            maxLength={60}
            autoComplete="off"
            invalid={invalidField === "displayName"}
            errorId={errorId}
          />
          <SelectField
            id="settings-district"
            name="districtCode"
            label={bg.family.district}
            defaultValue={person.districtCode}
            invalid={invalidField === "districtCode"}
            errorId={errorId}
          >
            {districtOptions().map((district) => (
              <option key={district.code} value={district.code}>
                {district.name}
              </option>
            ))}
          </SelectField>
          <div>
            <Button type="submit" variant="secondary" loading={pending}>
              {pending ? bg.family.saving : bg.family.saveChanges}
            </Button>
          </div>
        </fieldset>
        <FormMessage notice={notice} id={errorId} />
      </form>

      <div className="mt-10 border-t border-line pt-6">
        <h3 className="text-lg font-semibold">{bg.family.deleteTitle}</h3>
        <p className="mt-2 max-w-[60ch] text-fg-muted">{bg.family.deleteText}</p>
        <Button
          variant="secondary"
          className="mt-4"
          onClick={() => {
            setDeleteError(null);
            setConfirmOpen(true);
          }}
        >
          <Trash2 className="size-5" aria-hidden="true" />
          {bg.family.deleteButton}
        </Button>
      </div>

      <ConfirmDialog
        open={confirmOpen}
        title={fill(bg.family.deleteDialogTitle, { name: person.displayName })}
        text={bg.family.deleteDialogText}
        confirmLabel={bg.family.deleteConfirm}
        cancelLabel={bg.family.cancel}
        pendingLabel={bg.family.deleting}
        pending={deleting}
        error={deleteError}
        onConfirm={confirmDelete}
        onCancel={() => setConfirmOpen(false)}
      />
    </>
  );
}
