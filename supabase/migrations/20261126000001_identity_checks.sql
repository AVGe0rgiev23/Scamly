-- =============================================================================
-- Migration: identity_checks („Провери истинския“, D34, task P-05)
--
-- The protected phone asks the REAL family member: "the caller says they are
-- you, is it you?". The family member answers once: „Не съм аз“ (not_me) or
-- „Аз съм“ (its_me). One row = one question to one family member.
--
--   pending  -> not_me | its_me   the claimed family member answered (once)
--   pending  -> expired           the phone asked the next family member
--                                 (after 45 s without an answer)
--
-- The chain ("no answer in 45 s -> ask the next family member") is driven by
-- the phone: it simply asks the next person. A phone has at most ONE pending
-- question at a time: a new question from the same phone first marks its
-- previous pending one 'expired' (trigger below), and a partial unique index
-- makes it impossible to end up with two (also when two requests race).
--
-- A question can be answered only in its first 15 minutes (RLS policy below
-- and the API). Time-to-answer evidence (#7): answered_at - created_at.
--
-- Two locks, like everywhere else:
--   1. column privileges: a phone may insert only protected_person_id,
--      device_id and claimed_user_id; a family member may update only status.
--      status/created_at/answered_at can't be faked.
--   2. RLS policies: which rows. The API checks the same rules in code first.
-- =============================================================================


-- The four states of a question (see the top of this file).
create type public.identity_check_status as enum ('pending', 'not_me', 'its_me', 'expired');


-- -----------------------------------------------------------------------------
-- identity_checks: one „Провери истинския“ question to one family member.
-- device_id: the phone that asked (set null when it is unpaired: the history
-- stays). claimed_user_id: the family account the caller pretends to be;
-- deleting that account deletes its questions (GDPR).
-- -----------------------------------------------------------------------------
create table public.identity_checks (
  id                  uuid primary key default gen_random_uuid(),
  protected_person_id uuid not null references public.protected_persons (id) on delete cascade,
  device_id           uuid references public.devices (id) on delete set null,
  claimed_user_id     uuid not null references public.profiles (id) on delete cascade,
  status              public.identity_check_status not null default 'pending',
  created_at          timestamptz not null default now(),
  answered_at         timestamptz,

  -- answered_at is set exactly when the family member answered.
  constraint identity_checks_answered_at_matches_status
    check ((status in ('not_me', 'its_me')) = (answered_at is not null)),
  constraint identity_checks_answered_after_created
    check (answered_at is null or answered_at >= created_at)
);

-- The family's list: "questions about this person, newest first".
create index identity_checks_person_created_idx
  on public.identity_checks (protected_person_id, created_at desc);
-- The family member's own list: "questions addressed to me".
create index identity_checks_claimed_created_idx
  on public.identity_checks (claimed_user_id, created_at desc);
-- At most one open question per phone (the chain), see the top of this file.
create unique index identity_checks_one_pending_per_device
  on public.identity_checks (device_id)
  where status = 'pending';


-- -----------------------------------------------------------------------------
-- RLS helpers (same style as migration 3: SECURITY DEFINER, STABLE,
-- search_path = '').
-- -----------------------------------------------------------------------------

-- True when device did is the caller's own, not revoked phone of person pid.
create function public.is_own_device(did uuid, pid uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.devices as d
    where d.id = did
      and d.protected_person_id = pid
      and d.user_id = auth.uid()
      and d.revoked_at is null
  );
$$;

-- True when account uid is a family member of person pid: the owner, or a
-- trusted contact with that account, and the account has the role 'family'.
-- (A contact without an account can't answer, so it is never "family" here.)
create function public.is_family_member_of(pid uuid, uid uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
           select 1 from public.profiles as p
           where p.id = uid and p.role = 'family'
         )
     and (
           exists (
             select 1 from public.protected_persons as pp
             where pp.id = pid and pp.owner_id = uid
           )
           or exists (
             select 1 from public.trusted_contacts as tc
             where tc.protected_person_id = pid and tc.user_id = uid
           )
         );
$$;

revoke execute on function public.is_own_device(uuid, uuid) from public, anon;
revoke execute on function public.is_family_member_of(uuid, uuid) from public, anon;
grant execute on function public.is_own_device(uuid, uuid) to authenticated;
grant execute on function public.is_family_member_of(uuid, uuid) to authenticated;


-- -----------------------------------------------------------------------------
-- Triggers
-- -----------------------------------------------------------------------------

-- Before a new question: the same phone's previous pending question is
-- 'expired' (the phone moved on to the next family member). SECURITY DEFINER
-- because a phone has no UPDATE right on the table. If the new row is then
-- refused by RLS, the whole statement is rolled back, so a stranger can't
-- expire other phones' questions with a fake device_id.
create function public.expire_previous_identity_check()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.device_id is not null then
    update public.identity_checks
    set status = 'expired'
    where device_id = new.device_id
      and status = 'pending';
  end if;
  return new;
end;
$$;

create trigger identity_checks_expire_previous
  before insert on public.identity_checks
  for each row execute function public.expire_previous_identity_check();

-- When the family member answers, the DATABASE writes the time (nobody can
-- send their own answered_at).
create function public.set_identity_check_answered_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if old.status = 'pending' and new.status in ('not_me', 'its_me') then
    new.answered_at := now();
  end if;
  return new;
end;
$$;

create trigger identity_checks_set_answered_at
  before update on public.identity_checks
  for each row execute function public.set_identity_check_answered_at();

revoke execute on function public.expire_previous_identity_check() from public, anon, authenticated;
revoke execute on function public.set_identity_check_answered_at() from public, anon, authenticated;


-- -----------------------------------------------------------------------------
-- Privileges and RLS policies
--   * phone: ask a family member of ITS person (insert), read its own questions
--   * family with access to the person: read every question about the person
--     (the claimed one answers; the others get the „Някой се представя за…“
--     warning live)
--   * the claimed family member: answer once (update status), only while
--     pending and younger than 15 minutes
--   * admin: read all (time-to-answer statistics)
--   * no DELETE for anyone (rows go with the person / account, cascade)
-- -----------------------------------------------------------------------------
alter table public.identity_checks enable row level security;

revoke all on table public.identity_checks from anon, authenticated;
grant select on public.identity_checks to authenticated;
grant insert (protected_person_id, device_id, claimed_user_id) on public.identity_checks to authenticated;
grant update (status) on public.identity_checks to authenticated;

create policy "Devices can ask a family member of their protected person"
  on public.identity_checks for insert
  to authenticated
  with check (
    public.is_own_device(device_id, protected_person_id)
    and public.is_family_member_of(protected_person_id, claimed_user_id)
    and status = 'pending'
  );

create policy "Devices can read their own identity checks"
  on public.identity_checks for select
  to authenticated
  using (public.is_own_device(device_id, protected_person_id));

create policy "Family can read identity checks of persons they have access to"
  on public.identity_checks for select
  to authenticated
  using (public.has_family_access(protected_person_id));

create policy "Admins can read all identity checks"
  on public.identity_checks for select
  to authenticated
  using (public.is_admin());

create policy "The claimed family member can answer once within 15 minutes"
  on public.identity_checks for update
  to authenticated
  using (
    claimed_user_id = auth.uid()
    and public.has_family_access(protected_person_id)
    and status = 'pending'
    and created_at > now() - interval '15 minutes'
  )
  with check (
    claimed_user_id = auth.uid()
    and status in ('not_me', 'its_me')
  );


-- -----------------------------------------------------------------------------
-- Realtime: the phone follows its question, the family sees new questions and
-- answers live. Realtime applies the SELECT policies above to every subscriber.
-- -----------------------------------------------------------------------------
do $$
begin
  if exists (select 1 from pg_catalog.pg_publication where pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table public.identity_checks;
  end if;
end;
$$;
