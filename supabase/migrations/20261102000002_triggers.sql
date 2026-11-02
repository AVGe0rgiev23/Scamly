-- =============================================================================
-- Migration 2: triggers
--
-- Two automatic actions the database does for us, so the app can't forget them:
--   1. When someone signs up (a row appears in auth.users), create their
--      profile with role 'family'.
--   2. When a family member creates a protected person, add that family member
--      as trusted contact number 1.
--
-- Both trigger functions are SECURITY DEFINER: they run with the rights of the
-- function owner (the migration user), not of the person who caused the
-- insert. That is needed because, for example, Supabase Auth inserts into
-- auth.users as its own internal user, which has no rights on our tables.
-- "set search_path = ''" means every name inside must be written in full
-- (public.profiles, not profiles), so nobody can trick the function into
-- using a fake table with the same name in another schema.
-- =============================================================================


-- -----------------------------------------------------------------------------
-- 1. Create a profile for every new auth user.
--
-- Role: ALWAYS 'family'. We do NOT read a role from raw_user_meta_data,
-- because the person signing up controls that data and could write
-- "role": "admin". Device users get role 'protected' later from the server
-- (pairing), moderators/admins get their role from an admin (audited).
--
-- Display name: the 'display_name' the user typed at sign-up; if empty, the
-- part of the email before '@'; if there is no email, 'Потребител'.
-- Cut to 60 characters to fit the CHECK constraint on profiles.display_name.
-- -----------------------------------------------------------------------------
create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_name text;
begin
  v_name := coalesce(
    nullif(btrim(new.raw_user_meta_data ->> 'display_name'), ''),
    nullif(btrim(split_part(new.email, '@', 1)), ''),
    'Потребител'
  );

  insert into public.profiles (id, role, display_name)
  values (new.id, 'family', left(v_name, 60));

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_user();


-- -----------------------------------------------------------------------------
-- 2. Add the owner as trusted contact number 1 of a new protected person.
--
-- The contact gets the owner's display name from their profile. The phone is
-- left empty: the owner adds it later on the contacts page.
-- -----------------------------------------------------------------------------
create function public.add_owner_as_first_contact()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.trusted_contacts (protected_person_id, user_id, display_name, phone, priority)
  select new.id, p.id, p.display_name, null, 1
  from public.profiles as p
  where p.id = new.owner_id;

  return new;
end;
$$;

create trigger on_protected_person_created
  after insert on public.protected_persons
  for each row
  execute function public.add_owner_as_first_contact();


-- Trigger functions are only meant to be run by their triggers. Nobody should
-- call them through the API (Supabase exposes public functions as /rpc/...).
revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.add_owner_as_first_contact() from public, anon, authenticated;
