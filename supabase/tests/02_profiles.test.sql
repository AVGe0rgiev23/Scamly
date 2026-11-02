-- =============================================================================
-- 02_profiles: the sign-up trigger and the profiles policies.
--   * a new auth user gets a profile with role 'family' (never a role from
--     the user's own sign-up data)
--   * everyone reads only their own profile; an admin reads all
--   * family can update display_name / email_alerts, but NOT their role
--   * a protected device can't update its profile
--   * guests can't read profiles at all
-- =============================================================================
begin;
select plan(17);

-- Start from empty tables, so the exact counts below also hold when the local
-- database already has demo data. Everything in this file runs inside one
-- transaction that is rolled back at the end, so nothing is really deleted.
delete from auth.users;   -- cascades to profiles, persons, contacts, devices, checks, alerts...
delete from public.reports;
delete from public.scam_scripts;
delete from public.audit_log;

-- --- Test users (inserted as the superuser, like Supabase Auth would) ----------
insert into auth.users (id, email, raw_user_meta_data) values
  ('a0000000-0000-0000-0000-000000000001', 'anna@example.com',  '{"display_name": "Анна"}'),
  ('b0000000-0000-0000-0000-000000000002', 'boris@example.com', '{}'),
  ('c0000000-0000-0000-0000-000000000003', 'hacker@example.com', '{"display_name": "Хакер", "role": "admin"}'),
  ('d0000000-0000-0000-0000-000000000004', 'device-1@devices.scamly.invalid', '{}'),
  ('f0000000-0000-0000-0000-000000000006', 'mod@example.com',   '{"display_name": "Мод"}'),
  ('ad000000-0000-0000-0000-000000000007', 'admin@example.com', '{"display_name": "Админ"}'),
  ('e0000000-0000-0000-0000-000000000005', 'long@example.com',
     jsonb_build_object('display_name', repeat('Д', 70)));

-- --- The sign-up trigger -----------------------------------------------------------
select results_eq(
  $$ select role::text, display_name, email_alerts from public.profiles where id = 'a0000000-0000-0000-0000-000000000001' $$,
  $$ values ('family', 'Анна', true) $$,
  'sign-up creates a profile with role family and the display name from the sign-up form'
);

select is(
  (select display_name from public.profiles where id = 'b0000000-0000-0000-0000-000000000002'),
  'boris',
  'without a display name, the part of the email before @ is used'
);

select is(
  (select role::text from public.profiles where id = 'c0000000-0000-0000-0000-000000000003'),
  'family',
  'a role in the sign-up data is ignored: the new user is still family'
);

select is(
  (select char_length(display_name) from public.profiles where id = 'e0000000-0000-0000-0000-000000000005'),
  60,
  'a 70-character display name is cut to 60 characters'
);

-- Give the other test users their roles (as the admin API would).
update public.profiles set role = 'protected' where id = 'd0000000-0000-0000-0000-000000000004';
update public.profiles set role = 'moderator' where id = 'f0000000-0000-0000-0000-000000000006';
update public.profiles set role = 'admin'     where id = 'ad000000-0000-0000-0000-000000000007';

-- --- Family member Anna ------------------------------------------------------------
set local role authenticated;
set local request.jwt.claims = '{"sub": "a0000000-0000-0000-0000-000000000001", "role": "authenticated"}';

select results_eq(
  $$ select id from public.profiles $$,
  $$ values ('a0000000-0000-0000-0000-000000000001'::uuid) $$,
  'family sees only their own profile'
);

select is(
  (select count(*)::int from public.profiles where id = 'b0000000-0000-0000-0000-000000000002'),
  0,
  'IDOR: family can''t read another user''s profile'
);

update public.profiles set display_name = 'Анна Петрова', email_alerts = false
where id = 'a0000000-0000-0000-0000-000000000001';

select results_eq(
  $$ select display_name, email_alerts from public.profiles where id = 'a0000000-0000-0000-0000-000000000001' $$,
  $$ values ('Анна Петрова', false) $$,
  'family can update their own display_name and email_alerts'
);

select throws_ok(
  $$ update public.profiles set role = 'admin' where id = 'a0000000-0000-0000-0000-000000000001' $$,
  '42501', null,
  'family can''t change their own role (no column privilege)'
);

select throws_ok(
  $$ insert into public.profiles (id, display_name) values ('b0000000-0000-0000-0000-000000000099', 'Fake') $$,
  '42501', null,
  'family can''t insert profiles'
);

-- Anna tries to rename Boris: no error, but RLS hides Boris's row, so 0 rows change.
update public.profiles set display_name = 'Hacked' where id = 'b0000000-0000-0000-0000-000000000002';

-- --- Protected device ----------------------------------------------------------------
set local request.jwt.claims = '{"sub": "d0000000-0000-0000-0000-000000000004", "role": "authenticated"}';

select is((select count(*)::int from public.profiles), 1, 'a device sees only its own profile');

update public.profiles set display_name = 'Changed by device' where id = 'd0000000-0000-0000-0000-000000000004';

-- --- Moderator --------------------------------------------------------------------
set local request.jwt.claims = '{"sub": "f0000000-0000-0000-0000-000000000006", "role": "authenticated"}';

select is((select count(*)::int from public.profiles), 1, 'a moderator sees only their own profile');

-- --- Admin ----------------------------------------------------------------------
set local request.jwt.claims = '{"sub": "ad000000-0000-0000-0000-000000000007", "role": "authenticated"}';

select is((select count(*)::int from public.profiles), 7, 'an admin sees all profiles');

select throws_ok(
  $$ update public.profiles set role = 'family' where id = 'f0000000-0000-0000-0000-000000000006' $$,
  '42501', null,
  'even an admin can''t change roles directly (only via the audited admin API)'
);

-- --- Guest ----------------------------------------------------------------------
reset role;
set local role anon;
set local request.jwt.claims = '{"role": "anon"}';

select throws_ok(
  $$ select * from public.profiles $$,
  '42501', null,
  'a guest can''t read profiles at all'
);

-- --- Back to the superuser to check what really happened -------------------------
reset role;

select is(
  (select display_name from public.profiles where id = 'b0000000-0000-0000-0000-000000000002'),
  'boris',
  'IDOR: family could not rename another user'
);

select is(
  (select display_name from public.profiles where id = 'd0000000-0000-0000-0000-000000000004'),
  'device-1',
  'a device could not update its own profile'
);

-- Deleting the auth user deletes the profile (on delete cascade).
delete from auth.users where id = 'b0000000-0000-0000-0000-000000000002';

select is(
  (select count(*)::int from public.profiles where id = 'b0000000-0000-0000-0000-000000000002'),
  0,
  'deleting the auth user deletes the profile'
);

select * from finish();
rollback;
