-- =============================================================================
-- Migration: identity_checks.asked_user_id („Провери истинския“, D34, P-05 fix)
--
-- Until now one column, claimed_user_id, meant two things: who the caller
-- PRETENDS to be (Иван) and who is ASKED (Иван first, after 45 s Мария, …).
-- So Мария got „Някой се представя за теб…“ and her „Не съм аз“ showed
-- „Това НЕ е Мария“, although the caller said he was Иван.
--
-- Now:
--   claimed_user_id  who the caller pretends to be (stays the same in the chain)
--   asked_user_id    who gets this question and answers it (changes in the chain)
--
-- Only the ASKED family member answers (RLS + the API). The claimed one, like
-- every family member of the person, can read the question (has_family_access).
-- The "one pending question per phone" index and the expiry trigger stay as
-- they are: they only look at device_id.
--
-- Safe on the live database (migration 1 already ran there): every step is
-- idempotent, nothing is deleted, old rows get asked_user_id = claimed_user_id
-- (which is what they meant). An INSERT without asked_user_id still works
-- (a trigger copies claimed_user_id), so the old code keeps working between
-- this migration and the deploy of the new code.
-- =============================================================================


-- 1. The new column, filled for the existing rows, then NOT NULL.
alter table public.identity_checks
  add column if not exists asked_user_id uuid references public.profiles (id) on delete cascade;

update public.identity_checks
set asked_user_id = claimed_user_id
where asked_user_id is null;

alter table public.identity_checks
  alter column asked_user_id set not null;

-- The family member's own list: "questions addressed to me" (replaces the old
-- index on claimed_user_id, which no query uses any more).
create index if not exists identity_checks_asked_created_idx
  on public.identity_checks (asked_user_id, created_at desc);
drop index if exists public.identity_checks_claimed_created_idx;


-- 2. No asked_user_id in the INSERT -> the claimed person is asked (the first
-- question of a chain, and the old code). BEFORE triggers run before the NOT NULL
-- check and before the RLS WITH CHECK, so the policy below sees the filled value.
create or replace function public.default_identity_check_asked_user()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.asked_user_id is null then
    new.asked_user_id := new.claimed_user_id;
  end if;
  return new;
end;
$$;

revoke execute on function public.default_identity_check_asked_user() from public, anon, authenticated;

drop trigger if exists identity_checks_default_asked_user on public.identity_checks;
create trigger identity_checks_default_asked_user
  before insert on public.identity_checks
  for each row execute function public.default_identity_check_asked_user();


-- 3. Privileges: a phone may now also send asked_user_id (still no status,
-- created_at or answered_at). A family member still may update only status.
grant insert (asked_user_id) on public.identity_checks to authenticated;


-- 4. RLS: both people must be family members of the person; only the ASKED one
-- answers. (drop + create, because a policy can't be changed in place.)
drop policy if exists "Devices can ask a family member of their protected person"
  on public.identity_checks;
create policy "Devices can ask a family member of their protected person"
  on public.identity_checks for insert
  to authenticated
  with check (
    public.is_own_device(device_id, protected_person_id)
    and public.is_family_member_of(protected_person_id, claimed_user_id)
    and public.is_family_member_of(protected_person_id, asked_user_id)
    and status = 'pending'
  );

drop policy if exists "The claimed family member can answer once within 15 minutes"
  on public.identity_checks;
drop policy if exists "The asked family member can answer once within 15 minutes"
  on public.identity_checks;
create policy "The asked family member can answer once within 15 minutes"
  on public.identity_checks for update
  to authenticated
  using (
    asked_user_id = auth.uid()
    and public.has_family_access(protected_person_id)
    and status = 'pending'
    and created_at > now() - interval '15 minutes'
  )
  with check (
    asked_user_id = auth.uid()
    and status in ('not_me', 'its_me')
  );
