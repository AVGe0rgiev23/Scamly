-- =============================================================================
-- Migration: replace_trusted_contacts(person, contacts)
--
-- PUT /api/persons/:id/contacts (W2-08) replaces the whole ordered contact list
-- of a protected person: rename, change phones, reorder (swap places), add and
-- remove contacts, all at once.
--
-- Why a function and not a few API calls?
--   * One function call = ONE transaction. Either the whole new list is saved or
--     nothing changes; a half-saved list (e.g. contacts deleted, new ones
--     missing) is impossible.
--   * Swapping places (Анна 1 <-> Иван 2) needs ONE statement: the unique rule
--     "one contact per place" (trusted_contacts_person_priority_key, migration 1)
--     is DEFERRABLE, so PostgreSQL checks it at the END of a statement. Updating
--     the rows one by one would clash in the middle (two contacts on place 1).
--     Through the REST API (PostgREST) one request can't give different rows
--     different values, except with an upsert, which needs INSERT rights on the
--     `id` column that browsers deliberately don't have.
--
-- SECURITY INVOKER (the default, written out on purpose): the function runs
-- with the rights of the CALLER, not of its owner. So every rule from
-- migration 4 still applies inside it:
--   * RLS: only the owner of the person may insert / update / delete contacts
--   * column privileges: only display_name, phone and priority can be written,
--     so user_id (WHICH ACCOUNT a contact is) can never be set or changed here.
--     Existing contacts keep their user_id; new contacts have none.
-- The function adds three checks of its own, so even a direct call from a
-- browser can't break the list:
--   * the caller must own the person
--   * the owner's own contact row must stay in the list
--   * every id in the list must be a contact of this person
--
-- p_contacts is a JSON array, e.g.
--   [{"id": "<uuid>", "display_name": "Анна", "phone": null, "priority": 2},
--    {"display_name": "Съседката", "phone": "+359888123456", "priority": 1}]
-- (no "id" = a new contact). The API has already checked it with Zod
-- (1–5 contacts, places 1–5 used once, phone format); the CHECK and UNIQUE
-- constraints of the table check it once more.
-- =============================================================================

create function public.replace_trusted_contacts(p_person_id uuid, p_contacts jsonb)
returns void
language plpgsql
volatile
security invoker
set search_path = ''
as $$
declare
  v_owner_id     uuid;
  v_listed_ids   uuid[];
  v_updated_rows integer;
begin
  -- 1. Only the owner may change the list. (RLS would also stop the writes,
  --    but silently for UPDATE / DELETE; an error is clearer.)
  if not public.is_owner_of(p_person_id) then
    raise exception 'replace_trusted_contacts: only the owner may change the contact list'
      using errcode = '42501';  -- insufficient_privilege
  end if;

  if jsonb_typeof(p_contacts) is distinct from 'array' then
    raise exception 'replace_trusted_contacts: p_contacts must be a JSON array'
      using errcode = '22023';  -- invalid_parameter_value
  end if;

  select pp.owner_id into v_owner_id
  from public.protected_persons as pp
  where pp.id = p_person_id;

  -- The ids of the contacts that stay (rows without "id" are new contacts).
  select coalesce(array_agg(c.id), '{}')
  into v_listed_ids
  from jsonb_to_recordset(p_contacts) as c(id uuid)
  where c.id is not null;

  -- 2. The owner's own row must stay: they are the person's main contact.
  if exists (
       select 1 from public.trusted_contacts as tc
       where tc.protected_person_id = p_person_id
         and tc.user_id = v_owner_id
         and not (tc.id = any (v_listed_ids))
     ) then
    raise exception 'replace_trusted_contacts: the owner''s own contact must stay in the list'
      using errcode = '23514';  -- check_violation
  end if;

  -- 3. Remove the contacts that are no longer in the list.
  delete from public.trusted_contacts as tc
  where tc.protected_person_id = p_person_id
    and not (tc.id = any (v_listed_ids));

  -- 4. Update the contacts that stay, ALL IN ONE STATEMENT, so places can be
  --    swapped (the unique rule is checked at the end of the statement).
  update public.trusted_contacts as tc
  set display_name = c.display_name,
      phone        = c.phone,
      priority     = c.priority
  from jsonb_to_recordset(p_contacts) as c(id uuid, display_name text, phone text, priority smallint)
  where c.id is not null
    and tc.id = c.id
    and tc.protected_person_id = p_person_id;

  -- Every listed id must have been a contact of this person.
  get diagnostics v_updated_rows = row_count;
  if v_updated_rows <> cardinality(v_listed_ids) then
    raise exception 'replace_trusted_contacts: unknown contact id in the list'
      using errcode = '22023';
  end if;

  -- 5. Add the new contacts (no user_id: an account is attached only by an invite).
  --    The places they take are free now: step 3 removed the old rows and step 4
  --    moved the remaining ones to their final places.
  insert into public.trusted_contacts (protected_person_id, display_name, phone, priority)
  select p_person_id, c.display_name, c.phone, c.priority
  from jsonb_to_recordset(p_contacts) as c(id uuid, display_name text, phone text, priority smallint)
  where c.id is null;
end;
$$;

-- Only logged-in users may call it (and RLS + the owner check inside decide the
-- rest). Guests can't.
revoke execute on function public.replace_trusted_contacts(uuid, jsonb) from public, anon;
grant execute on function public.replace_trusted_contacts(uuid, jsonb) to authenticated;
