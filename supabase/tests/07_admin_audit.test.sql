-- =============================================================================
-- 07_admin_audit: the audit log is append-only and admin-only.
--   * only admins read it; family and moderators see nothing; guests refused
--   * nobody can insert from the browser (only the server)
--   * NOBODY can update or delete rows, not even an admin or our own server
--     (service_role), so history can't be rewritten
--   * the log line stays when the actor's account is deleted
-- =============================================================================
begin;
select plan(12);

-- Start from empty tables, so the exact counts below also hold when the local
-- database already has demo data. Everything in this file runs inside one
-- transaction that is rolled back at the end, so nothing is really deleted.
delete from auth.users;   -- cascades to profiles, persons, contacts, devices, checks, alerts...
delete from public.reports;
delete from public.scam_scripts;
delete from public.audit_log;

-- --- Test data (as the superuser) ----------------------------------------------
insert into auth.users (id, email) values
  ('a0000000-0000-0000-0000-000000000001', 'anna@example.com'),
  ('f0000000-0000-0000-0000-000000000006', 'mod@example.com'),
  ('ad000000-0000-0000-0000-000000000007', 'admin@example.com');

update public.profiles set role = 'moderator' where id = 'f0000000-0000-0000-0000-000000000006';
update public.profiles set role = 'admin'     where id = 'ad000000-0000-0000-0000-000000000007';

-- The policy table allows only SELECT for admins: no UPDATE/DELETE policy exists.
select policies_are(
  'public', 'audit_log',
  array['Admins can read the audit log'],
  'audit_log has only the admin SELECT policy (no update/delete policies)'
);

-- =============================================================================
-- Server (service_role): may add log lines, but never change them
-- =============================================================================
set local role service_role;

select lives_ok(
  $$ insert into public.audit_log (actor_id, action, target_type, target_id, details)
     values ('f0000000-0000-0000-0000-000000000006', 'report_approved', 'report', '42', '{"decision": "approve"}') $$,
  'the server can add a line to the audit log'
);

select throws_ok(
  $$ update public.audit_log set action = 'nothing_happened' $$,
  '42501', null,
  'even the server (service_role) can''t update the audit log'
);

select throws_ok(
  $$ delete from public.audit_log $$,
  '42501', null,
  'even the server (service_role) can''t delete from the audit log'
);

-- =============================================================================
-- Admin
-- =============================================================================
reset role;
set local role authenticated;
set local request.jwt.claims = '{"sub": "ad000000-0000-0000-0000-000000000007", "role": "authenticated"}';

select is((select count(*)::int from public.audit_log), 1, 'an admin can read the audit log');

select throws_ok(
  $$ update public.audit_log set action = 'nothing_happened' $$,
  '42501', null,
  'an admin can''t update the audit log'
);

select throws_ok(
  $$ delete from public.audit_log $$,
  '42501', null,
  'an admin can''t delete from the audit log'
);

-- =============================================================================
-- Moderator, family, guest
-- =============================================================================
set local request.jwt.claims = '{"sub": "f0000000-0000-0000-0000-000000000006", "role": "authenticated"}';

select is((select count(*)::int from public.audit_log), 0, 'a moderator can''t read the audit log (not even their own actions)');

set local request.jwt.claims = '{"sub": "a0000000-0000-0000-0000-000000000001", "role": "authenticated"}';

select is((select count(*)::int from public.audit_log), 0, 'family can''t read the audit log');

select throws_ok(
  $$ insert into public.audit_log (actor_id, action) values ('a0000000-0000-0000-0000-000000000001', 'fake_entry') $$,
  '42501', null,
  'family can''t write to the audit log'
);

reset role;
set local role anon;
set local request.jwt.claims = '{"role": "anon"}';

select throws_ok($$ select * from public.audit_log $$, '42501', null, 'a guest can''t read the audit log');

-- =============================================================================
-- The actor's account is deleted: the log line stays, only actor_id is cleared
-- =============================================================================
reset role;
delete from auth.users where id = 'f0000000-0000-0000-0000-000000000006';

select results_eq(
  $$ select actor_id, action from public.audit_log $$,
  $$ values (null::uuid, 'report_approved') $$,
  'deleting the actor keeps the log line (actor_id becomes null)'
);

select * from finish();
rollback;
