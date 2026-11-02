-- =============================================================================
-- 04_devices_pairing: devices and pairing_codes (BUILD_PLAN section 5).
--   * a device sees its own device row; family sees the devices of their person
--   * a REVOKED device sees nothing of its person any more
--   * pairing_codes can't be touched by anyone except the server
--   * nobody can create devices from the browser
--   * deleting a device's auth user removes the device, but keeps the history
-- =============================================================================
begin;
select plan(13);

-- Start from empty tables, so the exact counts below also hold when the local
-- database already has demo data. Everything in this file runs inside one
-- transaction that is rolled back at the end, so nothing is really deleted.
delete from auth.users;   -- cascades to profiles, persons, contacts, devices, checks, alerts...
delete from public.reports;
delete from public.scam_scripts;
delete from public.audit_log;

-- --- Test data (as the superuser) ----------------------------------------------
-- A = Anna (owner of Баба Мария), B = Boris (owner of Дядо Петър),
-- D = active device of Баба Мария, R = revoked device of Баба Мария.
insert into auth.users (id, email) values
  ('a0000000-0000-0000-0000-000000000001', 'anna@example.com'),
  ('b0000000-0000-0000-0000-000000000002', 'boris@example.com'),
  ('d0000000-0000-0000-0000-000000000004', 'device-d@devices.scamly.invalid'),
  ('e0000000-0000-0000-0000-000000000005', 'device-r@devices.scamly.invalid'),
  ('ad000000-0000-0000-0000-000000000007', 'admin@example.com');

update public.profiles set role = 'protected'
where id in ('d0000000-0000-0000-0000-000000000004', 'e0000000-0000-0000-0000-000000000005');
update public.profiles set role = 'admin' where id = 'ad000000-0000-0000-0000-000000000007';

insert into public.protected_persons (id, owner_id, display_name, district_code) values
  ('a1000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'Баба Мария', 'BG-02'),
  ('b1000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000002', 'Дядо Петър', 'BG-16');

insert into public.devices (id, protected_person_id, user_id, label, revoked_at) values
  ('d1000000-0000-0000-0000-000000000004', 'a1000000-0000-0000-0000-000000000001',
   'd0000000-0000-0000-0000-000000000004', 'Нов телефон', null),
  ('e1000000-0000-0000-0000-000000000005', 'a1000000-0000-0000-0000-000000000001',
   'e0000000-0000-0000-0000-000000000005', 'Изгубен телефон', now());

insert into public.checks (id, protected_person_id, device_id) values
  ('c1000000-0000-0000-0000-000000000001', 'a1000000-0000-0000-0000-000000000001', 'd1000000-0000-0000-0000-000000000004');

insert into public.pairing_codes (protected_person_id, code_hash, created_by, expires_at)
values ('a1000000-0000-0000-0000-000000000001', 'hmac-of-482915', 'a0000000-0000-0000-0000-000000000001', now() + interval '10 minutes');

-- =============================================================================
-- Active device D
-- =============================================================================
set local role authenticated;
set local request.jwt.claims = '{"sub": "d0000000-0000-0000-0000-000000000004", "role": "authenticated"}';

select results_eq(
  $$ select id from public.devices $$,
  $$ values ('d1000000-0000-0000-0000-000000000004'::uuid) $$,
  'a device sees only its own device row'
);

select is(
  (select count(*)::int from public.protected_persons where id = 'b1000000-0000-0000-0000-000000000002'),
  0,
  'IDOR: a device can''t read another family''s protected person'
);

select throws_ok(
  $$ update public.devices set revoked_at = null where id = 'e1000000-0000-0000-0000-000000000005' $$,
  '42501', null,
  'a device can''t un-revoke or change devices (no UPDATE privilege)'
);

-- =============================================================================
-- Revoked device R: sees nothing of its person
-- =============================================================================
set local request.jwt.claims = '{"sub": "e0000000-0000-0000-0000-000000000005", "role": "authenticated"}';

select is(
  (select count(*)::int from public.protected_persons)
  + (select count(*)::int from public.trusted_contacts)
  + (select count(*)::int from public.checks)
  + (select count(*)::int from public.devices),
  0,
  'a revoked device sees no person, no contacts, no checks and not even its own device row'
);

-- =============================================================================
-- Family A (owner) and B (stranger)
-- =============================================================================
set local request.jwt.claims = '{"sub": "a0000000-0000-0000-0000-000000000001", "role": "authenticated"}';

select is((select count(*)::int from public.devices), 2, 'the owner sees both devices of their person (active and revoked)');

select throws_ok(
  $$ select * from public.pairing_codes $$,
  '42501', null,
  'even the owner can''t read pairing codes (server only)'
);

select throws_ok(
  $$ insert into public.devices (protected_person_id, user_id)
     values ('a1000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000002') $$,
  '42501', null,
  'family can''t create devices directly (pairing goes through the server)'
);

set local request.jwt.claims = '{"sub": "b0000000-0000-0000-0000-000000000002", "role": "authenticated"}';

select is(
  (select count(*)::int from public.devices where protected_person_id = 'a1000000-0000-0000-0000-000000000001'),
  0,
  'IDOR: family B can''t see A''s devices'
);

-- =============================================================================
-- Admin and guest
-- =============================================================================
set local request.jwt.claims = '{"sub": "ad000000-0000-0000-0000-000000000007", "role": "authenticated"}';

select is((select count(*)::int from public.devices), 2, 'an admin sees all devices');

select throws_ok(
  $$ select * from public.pairing_codes $$,
  '42501', null,
  'even an admin can''t read pairing codes (server only)'
);

reset role;
set local role anon;
set local request.jwt.claims = '{"role": "anon"}';

select throws_ok(
  $$ insert into public.pairing_codes (protected_person_id, code_hash, created_by, expires_at)
     values ('a1000000-0000-0000-0000-000000000001', 'x', 'a0000000-0000-0000-0000-000000000001', now()) $$,
  '42501', null,
  'a guest can''t create pairing codes'
);

-- =============================================================================
-- Revoking = the server deletes the device's auth user (as superuser here)
-- =============================================================================
reset role;
delete from auth.users where id = 'd0000000-0000-0000-0000-000000000004';

select is(
  (select count(*)::int from public.devices where id = 'd1000000-0000-0000-0000-000000000004'),
  0,
  'deleting the device''s auth user deletes the device row'
);

select is(
  (select device_id from public.checks where id = 'c1000000-0000-0000-0000-000000000001'),
  null,
  'the check history stays; only its device_id becomes null'
);

select * from finish();
rollback;
