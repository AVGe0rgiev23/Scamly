-- =============================================================================
-- 05_checks_alerts: checks, alerts and push_subscriptions.
--   * family / devices see the checks of their own person only (IDOR tests)
--   * each family member sees only the alerts addressed to them
--   * nobody can write checks or alerts from the browser: the phone must not
--     be able to send its own verdict
--   * moderators see nothing, admins see everything
--   * push subscriptions: everyone manages only their own
-- =============================================================================
begin;
select plan(19);

-- Start from empty tables, so the exact counts below also hold when the local
-- database already has demo data. Everything in this file runs inside one
-- transaction that is rolled back at the end, so nothing is really deleted.
delete from auth.users;   -- cascades to profiles, persons, contacts, devices, checks, alerts...
delete from public.reports;
delete from public.scam_scripts;
delete from public.audit_log;

-- --- Test data (as the superuser) ----------------------------------------------
-- A = Anna (owner of Баба Мария), B = Boris (owner of Дядо Петър),
-- C = Cveta (contact of Баба Мария), D = device of Баба Мария,
-- M = moderator, ADM = admin.
insert into auth.users (id, email) values
  ('a0000000-0000-0000-0000-000000000001', 'anna@example.com'),
  ('b0000000-0000-0000-0000-000000000002', 'boris@example.com'),
  ('c0000000-0000-0000-0000-000000000003', 'cveta@example.com'),
  ('d0000000-0000-0000-0000-000000000004', 'device-d@devices.scamly.invalid'),
  ('f0000000-0000-0000-0000-000000000006', 'mod@example.com'),
  ('ad000000-0000-0000-0000-000000000007', 'admin@example.com');

update public.profiles set role = 'protected' where id = 'd0000000-0000-0000-0000-000000000004';
update public.profiles set role = 'moderator' where id = 'f0000000-0000-0000-0000-000000000006';
update public.profiles set role = 'admin'     where id = 'ad000000-0000-0000-0000-000000000007';

insert into public.protected_persons (id, owner_id, display_name, district_code) values
  ('a1000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'Баба Мария', 'BG-02'),
  ('b1000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000002', 'Дядо Петър', 'BG-16');

insert into public.trusted_contacts (protected_person_id, user_id, display_name, priority)
values ('a1000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000003', 'Цвета', 2);

insert into public.devices (id, protected_person_id, user_id)
values ('d1000000-0000-0000-0000-000000000004', 'a1000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000004');

-- Two checks for Баба Мария (one answered, one just started), one for Дядо Петър.
insert into public.checks (id, protected_person_id, device_id, status, score, risk_level, script_type, answered_at) values
  ('ca000000-0000-0000-0000-000000000001', 'a1000000-0000-0000-0000-000000000001', 'd1000000-0000-0000-0000-000000000004',
   'answered', 95, 'red', 'police', now()),
  ('ca000000-0000-0000-0000-000000000002', 'a1000000-0000-0000-0000-000000000001', 'd1000000-0000-0000-0000-000000000004',
   'started', null, null, null, null),
  ('cb000000-0000-0000-0000-000000000003', 'b1000000-0000-0000-0000-000000000002', null,
   'answered', 10, 'green', 'unknown', now());

-- Fan-out: Anna and Cveta are alerted about Мария's check, Boris about Петър's.
insert into public.alerts (check_id, recipient_id, channel, status) values
  ('ca000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'realtime', 'sent'),
  ('ca000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000003', 'push', 'sent'),
  ('cb000000-0000-0000-0000-000000000003', 'b0000000-0000-0000-0000-000000000002', 'email', 'pending');

-- =============================================================================
-- Family A (owner)
-- =============================================================================
set local role authenticated;
set local request.jwt.claims = '{"sub": "a0000000-0000-0000-0000-000000000001", "role": "authenticated"}';

select is((select count(*)::int from public.checks), 2, 'owner sees the 2 checks of their person');

select is(
  (select count(*)::int from public.checks where protected_person_id = 'b1000000-0000-0000-0000-000000000002'),
  0,
  'IDOR: family A can''t read B''s checks'
);

select results_eq(
  $$ select recipient_id from public.alerts $$,
  $$ values ('a0000000-0000-0000-0000-000000000001'::uuid) $$,
  'family sees only the alerts addressed to them (not Cveta''s)'
);

select throws_ok(
  $$ insert into public.checks (protected_person_id) values ('a1000000-0000-0000-0000-000000000001') $$,
  '42501', null,
  'family can''t create checks directly'
);

select throws_ok(
  $$ insert into public.alerts (check_id, recipient_id, channel)
     values ('ca000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000002', 'push') $$,
  '42501', null,
  'family can''t create alerts for other users'
);

-- =============================================================================
-- Family B (stranger to Баба Мария)
-- =============================================================================
set local request.jwt.claims = '{"sub": "b0000000-0000-0000-0000-000000000002", "role": "authenticated"}';

select is(
  (select count(*)::int from public.alerts where check_id = 'ca000000-0000-0000-0000-000000000001'),
  0,
  'IDOR: family B can''t read the alerts about A''s person'
);

-- =============================================================================
-- Family C (trusted contact of Баба Мария)
-- =============================================================================
set local request.jwt.claims = '{"sub": "c0000000-0000-0000-0000-000000000003", "role": "authenticated"}';

select is((select count(*)::int from public.checks), 2, 'a trusted contact sees the checks of the person');
select is((select count(*)::int from public.alerts), 1, 'a trusted contact sees their own alert');

-- =============================================================================
-- Device D
-- =============================================================================
set local request.jwt.claims = '{"sub": "d0000000-0000-0000-0000-000000000004", "role": "authenticated"}';

select is((select count(*)::int from public.checks), 2, 'a device sees the checks of its own person only');
select is((select count(*)::int from public.alerts), 0, 'a device sees no alerts');

select throws_ok(
  $$ update public.checks set score = 0, risk_level = 'green' where id = 'ca000000-0000-0000-0000-000000000001' $$,
  '42501', null,
  'a device can''t write its own verdict (no UPDATE privilege on checks)'
);

select throws_ok(
  $$ insert into public.checks (protected_person_id, device_id)
     values ('a1000000-0000-0000-0000-000000000001', 'd1000000-0000-0000-0000-000000000004') $$,
  '42501', null,
  'a device can''t insert checks directly (the API does it with the server-computed verdict)'
);

-- =============================================================================
-- Moderator and admin
-- =============================================================================
set local request.jwt.claims = '{"sub": "f0000000-0000-0000-0000-000000000006", "role": "authenticated"}';

select is(
  (select count(*)::int from public.checks) + (select count(*)::int from public.alerts),
  0,
  'a moderator sees no checks and no alerts'
);

set local request.jwt.claims = '{"sub": "ad000000-0000-0000-0000-000000000007", "role": "authenticated"}';

select is((select count(*)::int from public.checks), 3, 'an admin sees all checks (statistics)');
select is((select count(*)::int from public.alerts), 3, 'an admin sees all alerts');

-- =============================================================================
-- push_subscriptions
-- =============================================================================
set local request.jwt.claims = '{"sub": "a0000000-0000-0000-0000-000000000001", "role": "authenticated"}';

select lives_ok(
  $$ insert into public.push_subscriptions (user_id, endpoint, p256dh, auth)
     values ('a0000000-0000-0000-0000-000000000001', 'https://push.example/anna', 'key', 'secret') $$,
  'a user can add their own push subscription'
);

select throws_ok(
  $$ insert into public.push_subscriptions (user_id, endpoint, p256dh, auth)
     values ('b0000000-0000-0000-0000-000000000002', 'https://push.example/fake', 'key', 'secret') $$,
  '42501', null,
  'a user can''t add a push subscription for somebody else'
);

set local request.jwt.claims = '{"sub": "d0000000-0000-0000-0000-000000000004", "role": "authenticated"}';

select lives_ok(
  $$ insert into public.push_subscriptions (user_id, endpoint, p256dh, auth)
     values ('d0000000-0000-0000-0000-000000000004', 'https://push.example/device', 'key', 'secret') $$,
  'a device can add its own push subscription'
);

select is((select count(*)::int from public.push_subscriptions), 1, 'a user sees only their own push subscriptions');

select * from finish();
rollback;
