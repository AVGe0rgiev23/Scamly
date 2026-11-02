-- =============================================================================
-- Migration 3: RLS helper functions (BUILD_PLAN 2.4)
--
-- Small yes/no questions that the RLS policies (migration 4) ask about the
-- person who is calling, e.g. "is the caller an admin?".
--
-- Why functions instead of writing the SQL inside every policy?
--   * One place to read and test each rule, with a clear name.
--   * SECURITY DEFINER: the function reads profiles / protected_persons /
--     trusted_contacts / devices with the rights of the function owner, so
--     RLS on those tables does not apply INSIDE the function. Without this,
--     a policy on table A that reads table B, whose policy reads table A,
--     would loop forever ("infinite recursion detected in policy").
--   * STABLE: the answer doesn't change during one SQL statement, so
--     PostgreSQL may reuse it instead of recomputing it for every row.
--   * set search_path = '': every name inside is written in full
--     (public.profiles, auth.uid()), so nobody can trick the function into
--     using a fake table with the same name in another schema.
--
-- auth.uid() is provided by Supabase: the id of the logged-in user, taken
-- from their JWT. For a guest (not logged in) it is null, so every function
-- below returns false (or null for app_role()).
-- =============================================================================


-- The caller's role from profiles ('family', 'protected', 'moderator',
-- 'admin'), or null for a guest.
-- (The function and the enum type are both called app_role. PostgreSQL keeps
-- types and functions apart, and the () makes it clear we mean the function.)
create function public.app_role()
returns public.app_role
language sql
stable
security definer
set search_path = ''
as $$
  select p.role
  from public.profiles as p
  where p.id = auth.uid();
$$;


-- True when the caller is an admin.
create function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(public.app_role() = 'admin', false);
$$;


-- True when the caller is a moderator OR an admin (an admin can do
-- everything a moderator can).
create function public.is_moderator()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(public.app_role() in ('moderator', 'admin'), false);
$$;


-- True when the caller created (owns) protected person pid.
create function public.is_owner_of(pid uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.protected_persons as pp
    where pp.id = pid
      and pp.owner_id = auth.uid()
  );
$$;


-- True when the caller is the owner of protected person pid, OR is one of
-- their trusted contacts with an account (trusted_contacts.user_id).
create function public.has_family_access(pid uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.is_owner_of(pid)
      or exists (
           select 1
           from public.trusted_contacts as tc
           where tc.protected_person_id = pid
             and tc.user_id = auth.uid()
         );
$$;


-- True when the caller is a paired phone of protected person pid that has
-- NOT been revoked.
create function public.is_device_of(pid uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.devices as d
    where d.protected_person_id = pid
      and d.user_id = auth.uid()
      and d.revoked_at is null
  );
$$;


-- -----------------------------------------------------------------------------
-- Who may run these functions.
-- By default PostgreSQL lets everyone (PUBLIC) run a new function, and
-- Supabase also grants it to anon. Guests never need them (the policies that
-- use them are only "to authenticated"), so we take that away and give it
-- only to logged-in users.
-- -----------------------------------------------------------------------------
revoke execute on function public.app_role() from public, anon;
revoke execute on function public.is_admin() from public, anon;
revoke execute on function public.is_moderator() from public, anon;
revoke execute on function public.is_owner_of(uuid) from public, anon;
revoke execute on function public.has_family_access(uuid) from public, anon;
revoke execute on function public.is_device_of(uuid) from public, anon;

grant execute on function public.app_role() to authenticated;
grant execute on function public.is_admin() to authenticated;
grant execute on function public.is_moderator() to authenticated;
grant execute on function public.is_owner_of(uuid) to authenticated;
grant execute on function public.has_family_access(uuid) to authenticated;
grant execute on function public.is_device_of(uuid) to authenticated;
