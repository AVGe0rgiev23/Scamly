-- =============================================================================
-- 03_persons_contacts: protected_persons, trusted_contacts, contact_invites.
--   * the owner is added as trusted contact #1 automatically
--   * family sees only people they own or are a contact of (IDOR tests)
--   * only the owner may change a person or its contacts
--   * a device sees its own person and the contact list ("call Ivan")
--   * moderators see nothing, admins see everything, guests are refused
-- =============================================================================
begin;
select plan(29);

-- Start from empty tables, so the exact counts below also hold when the local
-- database already has demo data. Everything in this file runs inside one
-- transaction that is rolled back at the end, so nothing is really deleted.
delete from auth.users;   -- cascades to profiles, persons, contacts, devices, checks, alerts...
delete from public.reports;
delete from public.scam_scripts;
delete from public.audit_log;

-- --- Test data (as the superuser) ----------------------------------------------
-- A = Anna (family, owner of Баба Мария), B = Boris (family, owner of Дядо Петър),
-- C = Cveta (family, trusted contact of Баба Мария), D = device of Баба Мария,
-- M = moderator, ADM = admin.
insert into auth.users (id, email, raw_user_meta_data) values
  ('a0000000-0000-0000-0000-000000000001', 'anna@example.com',  '{"display_name": "Анна"}'),
  ('b0000000-0000-0000-0000-000000000002', 'boris@example.com', '{"display_name": "Борис"}'),
  ('c0000000-0000-0000-0000-000000000003', 'cveta@example.com', '{"display_name": "Цвета"}'),
  ('d0000000-0000-0000-0000-000000000004', 'device-d@devices.scamly.invalid', '{}'),
  ('f0000000-0000-0000-0000-000000000006', 'mod@example.com',   '{}'),
  ('ad000000-0000-0000-0000-000000000007', 'admin@example.com', '{}');

update public.profiles set role = 'protected' where id = 'd0000000-0000-0000-0000-000000000004';
update public.profiles set role = 'moderator' where id = 'f0000000-0000-0000-0000-000000000006';
update public.profiles set role = 'admin'     where id = 'ad000000-0000-0000-0000-000000000007';

insert into public.protected_persons (id, owner_id, display_name, district_code) values
  ('a1000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'Баба Мария', 'BG-02'),
  ('b1000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000002', 'Дядо Петър', 'BG-16');

-- Cveta joined Баба Мария's contacts through an invite (server sets user_id),
-- plus one contact without an account.
insert into public.trusted_contacts (protected_person_id, user_id, display_name, phone, priority) values
  ('a1000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000003', 'Цвета', '+359888111222', 2),
  ('a1000000-0000-0000-0000-000000000001', null, 'Съседката Гергана', '+359888333444', 3);

insert into public.devices (protected_person_id, user_id, label)
values ('a1000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000004', 'Телефонът на баба');

insert into public.contact_invites (protected_person_id, display_name, priority, token_hash, expires_at)
values ('a1000000-0000-0000-0000-000000000001', 'Иван', 4, 'hash-of-invite-token', now() + interval '7 days');

-- --- Owner auto-contact trigger ---------------------------------------------------
select results_eq(
  $$ select user_id, display_name, phone, priority::int from public.trusted_contacts
     where protected_person_id = 'a1000000-0000-0000-0000-000000000001' and priority = 1 $$,
  $$ values ('a0000000-0000-0000-0000-000000000001'::uuid, 'Анна', null::text, 1) $$,
  'the owner is added automatically as trusted contact #1 (name from profile, no phone)'
);

select is(
  (select count(*)::int from public.trusted_contacts where protected_person_id = 'b1000000-0000-0000-0000-000000000002'),
  1,
  'Boris''s new person also got exactly one automatic contact'
);

-- =============================================================================
-- Family member A (owner of Баба Мария)
-- =============================================================================
set local role authenticated;
set local request.jwt.claims = '{"sub": "a0000000-0000-0000-0000-000000000001", "role": "authenticated"}';

select results_eq(
  $$ select display_name from public.protected_persons $$,
  $$ values ('Баба Мария') $$,
  'owner sees only their own protected person'
);

select is(
  (select count(*)::int from public.protected_persons where id = 'b1000000-0000-0000-0000-000000000002'),
  0,
  'IDOR: family A can''t read B''s protected person'
);

select is(
  (select count(*)::int from public.trusted_contacts where protected_person_id = 'b1000000-0000-0000-0000-000000000002'),
  0,
  'IDOR: family A can''t read B''s trusted contacts'
);

select is((select count(*)::int from public.trusted_contacts), 3, 'owner sees all 3 contacts of their person');

select is((select count(*)::int from public.contact_invites), 1, 'owner sees the invites of their person');

-- Owner edits their person and the contact list.
update public.protected_persons set display_name = 'Баба Мария Иванова'
where id = 'a1000000-0000-0000-0000-000000000001';

select is(
  (select display_name from public.protected_persons where id = 'a1000000-0000-0000-0000-000000000001'),
  'Баба Мария Иванова',
  'owner can rename their protected person'
);

select lives_ok(
  $$ insert into public.trusted_contacts (protected_person_id, display_name, phone, priority)
     values ('a1000000-0000-0000-0000-000000000001', 'Иван', '+359888555666', 5) $$,
  'owner can add a contact'
);

select throws_ok(
  $$ update public.protected_persons set owner_id = 'b0000000-0000-0000-0000-000000000002'
     where id = 'a1000000-0000-0000-0000-000000000001' $$,
  '42501', null,
  'owner can''t give the person away to another account (owner_id is not updatable)'
);

select throws_ok(
  $$ insert into public.trusted_contacts (protected_person_id, user_id, display_name, priority)
     values ('a1000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000002', 'Борис', 4) $$,
  '42501', null,
  'owner can''t attach another user''s account as a contact (only via invite)'
);

select throws_ok(
  $$ insert into public.trusted_contacts (protected_person_id, display_name, priority)
     values ('b1000000-0000-0000-0000-000000000002', 'Натрапник', 2) $$,
  '42501', null,
  'IDOR: family A can''t add a contact to B''s person'
);

select throws_ok(
  $$ insert into public.protected_persons (owner_id, display_name, district_code)
     values ('b0000000-0000-0000-0000-000000000002', 'Чужд човек', 'BG-02') $$,
  '42501', null,
  'family can''t create a protected person owned by somebody else'
);

-- Creating a new person (as the API does with the user's session). RETURNING
-- needs the SELECT policy to accept the brand-new row too.
select lives_ok(
  $$ insert into public.protected_persons (owner_id, display_name, district_code)
     values ('a0000000-0000-0000-0000-000000000001', 'Дядо Стефан', 'BG-03') returning id $$,
  'family can create a protected person they own'
);

-- A tries to rename and delete B's person: RLS hides the row, 0 rows change.
update public.protected_persons set display_name = 'Hacked' where id = 'b1000000-0000-0000-0000-000000000002';
delete from public.protected_persons where id = 'b1000000-0000-0000-0000-000000000002';

-- =============================================================================
-- Family member C (trusted contact of Баба Мария, not the owner)
-- =============================================================================
set local request.jwt.claims = '{"sub": "c0000000-0000-0000-0000-000000000003", "role": "authenticated"}';

select results_eq(
  $$ select id from public.protected_persons $$,
  $$ values ('a1000000-0000-0000-0000-000000000001'::uuid) $$,
  'a trusted contact sees the person they are a contact of'
);

select is((select count(*)::int from public.trusted_contacts), 4, 'a trusted contact sees the contact list');

select is((select count(*)::int from public.contact_invites), 0, 'a trusted contact (not owner) can''t see invites');

select throws_ok(
  $$ insert into public.trusted_contacts (protected_person_id, display_name, priority)
     values ('a1000000-0000-0000-0000-000000000001', 'Друг', 4) $$,
  '42501', null,
  'a trusted contact who is not the owner can''t add contacts'
);

update public.protected_persons set display_name = 'Changed by contact' where id = 'a1000000-0000-0000-0000-000000000001';
delete from public.trusted_contacts where protected_person_id = 'a1000000-0000-0000-0000-000000000001';

-- =============================================================================
-- Device D (paired to Баба Мария)
-- =============================================================================
set local request.jwt.claims = '{"sub": "d0000000-0000-0000-0000-000000000004", "role": "authenticated"}';

select results_eq(
  $$ select id from public.protected_persons $$,
  $$ values ('a1000000-0000-0000-0000-000000000001'::uuid) $$,
  'a device sees only its own protected person'
);

select is((select count(*)::int from public.trusted_contacts), 4, 'a device sees the contacts of its person (for the call button)');

select throws_ok(
  $$ insert into public.protected_persons (owner_id, display_name, district_code)
     values ('d0000000-0000-0000-0000-000000000004', 'Нов', 'BG-02') $$,
  '42501', null,
  'a device can''t create protected persons (role must be family)'
);

-- =============================================================================
-- Moderator, admin, guest
-- =============================================================================
set local request.jwt.claims = '{"sub": "f0000000-0000-0000-0000-000000000006", "role": "authenticated"}';

select is(
  (select count(*)::int from public.protected_persons) + (select count(*)::int from public.trusted_contacts),
  0,
  'a moderator sees no protected persons and no contacts'
);

set local request.jwt.claims = '{"sub": "ad000000-0000-0000-0000-000000000007", "role": "authenticated"}';

select is((select count(*)::int from public.protected_persons), 3, 'an admin sees all protected persons');
select is((select count(*)::int from public.trusted_contacts), 6, 'an admin sees all contacts');
select is((select count(*)::int from public.contact_invites), 0, 'an admin can''t see invites (not in the policy table)');

reset role;
set local role anon;
set local request.jwt.claims = '{"role": "anon"}';

select throws_ok(
  $$ select * from public.protected_persons $$,
  '42501', null,
  'a guest can''t read protected persons'
);

-- =============================================================================
-- Superuser: check that the forbidden changes really did not happen
-- =============================================================================
reset role;

select results_eq(
  $$ select display_name from public.protected_persons where id = 'b1000000-0000-0000-0000-000000000002' $$,
  $$ values ('Дядо Петър') $$,
  'IDOR: A could neither rename nor delete B''s person'
);

select is(
  (select display_name from public.protected_persons where id = 'a1000000-0000-0000-0000-000000000001'),
  'Баба Мария Иванова',
  'a trusted contact who is not the owner could not rename the person'
);

select is(
  (select count(*)::int from public.trusted_contacts where protected_person_id = 'a1000000-0000-0000-0000-000000000001'),
  4,
  'a trusted contact who is not the owner could not delete contacts'
);

select * from finish();
rollback;
