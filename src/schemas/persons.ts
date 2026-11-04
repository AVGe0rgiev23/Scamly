// Input rules (Zod schemas) for protected persons and for ids in the URL.

import { z } from "zod";
import { bg } from "@/i18n/bg";

// The two fields, shared by "create" and "update".
const PersonDisplayName = z
  .string({ error: bg.persons.displayNameInvalid })
  .trim()
  .min(1, { error: bg.persons.displayNameInvalid })
  .max(60, { error: bg.persons.displayNameInvalid });
// One of the 28 districts: BG-01 … BG-28 (ISO 3166-2:BG).
const DistrictCode = z
  .string({ error: bg.persons.districtInvalid })
  .regex(/^BG-(0[1-9]|1[0-9]|2[0-8])$/, { error: bg.persons.districtInvalid });

export const CreatePersonSchema = z.object(
  { displayName: PersonDisplayName, districtCode: DistrictCode },
  { error: bg.errors.validation },
);

export type CreatePersonInput = z.infer<typeof CreatePersonSchema>;

// PATCH /api/persons/:id: rename and/or change the district (at least one of them).
export const UpdatePersonSchema = z
  .object(
    { displayName: PersonDisplayName.optional(), districtCode: DistrictCode.optional() },
    { error: bg.errors.validation },
  )
  .refine((input) => input.displayName !== undefined || input.districtCode !== undefined, {
    error: bg.persons.nothingToChange,
  });

export type UpdatePersonInput = z.infer<typeof UpdatePersonSchema>;

// An id in the URL (/api/persons/<id>/…). Not in the uuid format -> the route answers
// 404, exactly as for an id that doesn't exist. z.guid() accepts any
// 8-4-4-4-12 hex id (z.uuid() would also reject hand-made test ids like a100…0001).
export const IdParamSchema = z.guid();
