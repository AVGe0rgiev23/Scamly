-- =============================================================================
-- 15_identity_checks: „Провери истинския“ (D34, task P-05).
--   * a phone may ask only a family member (with an account) of ITS person
--   * a new question from the same phone expires its previous pending one
--   * only the ASKED family member answers, once, within 15 minutes;
--     the database writes answered_at itself
--   * the chain: the caller still claims to be Anna while Cveta is asked
--     (claimed_user_id <> asked_user_id, migration 20261126000002)
--   * the family of the person reads every question; strangers, other phones
--     and moderators read nothing (IDOR); admins read all
--   * nobody can fake status, created_at or answered_at
-- =============================================================================
begin;
select plan(44);

delete from auth.users;   -- cascades to profiles, persons, contacts, devices, questions...

-- --- Test data (as the superuser) ----------------------------------------------
-- A = Anna (owner of Мария), C = Cveta (contact of Мария with an account),
-- B = Boris (owner of Петър, a stranger to Мария), D = phone of Мария,
-- E = phone of Петър, M = moderator (also listed as Мария's contact, but not
-- 'family', so nobody can ask them), ADM = admin.
insert into auth.users (id, email) values
  ('a0000000-0000-0000-0000-000000000001', 'anna@example.com'),
  ('b0000000-0000-0000-0000-000000000002', 'boris@example.com'),
  ('c0000000-0000-0000-0000-000000000003', 'cveta@example.com'),
  ('d0000000-0000-0000-0000-000000000004', 'device-d@devices.scamly.invalid'),
  ('e0000000-0000-0000-0000-000000000005', 'device-e@devices.scamly.invalid'),
  ('f0000000-0000-0000-0000-000000000006', 'mod@example.com'),
  ('ad000000-0000-0000-0000-000000000007', 'admin@example.com');

update public.profiles set role = 'protected'
where id in ('d0000000-0000-0000-0000-000000000004', 'e0000000-0000-0000-0000-000000000005');
update public.profiles set role = 'moderator' where id = 'f0000000-0000-0000-0000-000000000006';
update public.profiles set role = 'admin'     where id = 'ad000000-0000-0000-0000-000000000007';

insert into public.protected_persons (id, owner_id, display_name, district_code) values
  ('a1000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'Мария', 'BG-02'),
  ('b1000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000002', 'Петър', 'BG-16');

insert into public.trusted_contacts (protected_person_id, user_id, display_name, phone, priority) values
  ('a1000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000003', 'Цвета', null, 2),
  ('a1000000-0000-0000-0000-000000000001', 'f0000000-0000-0000-0000-000000000006', 'Митко', null, 3);

insert into public.devices (id, protected_person_id, user_id) values
  ('d1000000-0000-0000-0000-000000000004', 'a1000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000004'),
  ('e1000000-0000-0000-0000-000000000005', 'b1000000-0000-0000-0000-000000000002', 'e0000000-0000-0000-0000-000000000005');

-- An old question (20 minutes ago) to Cveta from another (unpaired) phone.
insert into public.identity_checks (id, protected_person_id, device_id, claimed_user_id, created_at) values
  ('1c000000-0000-0000-0000-000000000099', 'a1000000-0000-0000-0000-000000000001', null,
   'c0000000-0000-0000-0000-000000000003', now() - interval '20 minutes');

select has_index('public', 'identity_checks', 'identity_checks_one_pending_per_device',
  'at most one pending question per phone (partial unique index)');

-- =============================================================================
-- Phone D (Мария)
-- =============================================================================
set local role authenticated;
set local request.jwt.claims = '{"sub": "d0000000-0000-0000-0000-000000000004", "role": "authenticated"}';

select lives_ok(
  $$ insert into public.identity_checks (protected_person_id, device_id, claimed_user_id)
     values ('a1000000-0000-0000-0000-000000000001',
             'd1000000-0000-0000-0000-000000000004', 'c0000000-0000-0000-0000-000000000003') $$,
  'a phone can ask a family member of its own person'
);

select throws_ok(
  $$ insert into public.identity_checks (protected_person_id, device_id, claimed_user_id)
     values ('a1000000-0000-0000-0000-000000000001', 'd1000000-0000-0000-0000-000000000004',
             'b0000000-0000-0000-0000-000000000002') $$,
  '42501', null,
  'a phone can''t ask someone who is not in the family (Boris)'
);

select throws_ok(
  $$ insert into public.identity_checks (protected_person_id, device_id, claimed_user_id)
     values ('a1000000-0000-0000-0000-000000000001', 'd1000000-0000-0000-0000-000000000004',
             'f0000000-0000-0000-0000-000000000006') $$,
  '42501', null,
  'a phone can''t ask a contact whose account is not a family account'
);

select throws_ok(
  $$ insert into public.identity_checks (protected_person_id, device_id, claimed_user_id)
     values ('a1000000-0000-0000-0000-000000000001', 'e1000000-0000-0000-0000-000000000005',
             'a0000000-0000-0000-0000-000000000001') $$,
  '42501', null,
  'IDOR: a phone can''t ask in the name of another phone'
);

select throws_ok(
  $$ insert into public.identity_checks (protected_person_id, device_id, claimed_user_id)
     values ('b1000000-0000-0000-0000-000000000002', 'd1000000-0000-0000-0000-000000000004',
             'b0000000-0000-0000-0000-000000000002') $$,
  '42501', null,
  'IDOR: a phone can''t ask about another person'
);

select throws_ok(
  $$ insert into public.identity_checks (protected_person_id, device_id, claimed_user_id, status)
     values ('a1000000-0000-0000-0000-000000000001', 'd1000000-0000-0000-0000-000000000004',
             'a0000000-0000-0000-0000-000000000001', 'its_me') $$,
  '42501', null,
  'a phone can''t write the answer itself (no privilege on status)'
);

select throws_ok(
  $$ insert into public.identity_checks (protected_person_id, device_id, claimed_user_id, created_at)
     values ('a1000000-0000-0000-0000-000000000001', 'd1000000-0000-0000-0000-000000000004',
             'a0000000-0000-0000-0000-000000000001', now() - interval '1 hour') $$,
  '42501', null,
  'a phone can''t choose created_at'
);

-- 45 s without an answer: the phone asks the next family member (Anna).
select lives_ok(
  $$ insert into public.identity_checks (protected_person_id, device_id, claimed_user_id)
     values ('a1000000-0000-0000-0000-000000000001',
             'd1000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000001') $$,
  'the phone can ask the next family member'
);

select results_eq(
  $$ select claimed_user_id::text, status::text from public.identity_checks order by claimed_user_id $$,
  $$ values ('a0000000-0000-0000-0000-000000000001', 'pending'),
            ('c0000000-0000-0000-0000-000000000003', 'expired') $$,
  'the previous question is expired; the phone sees only its own questions'
);

update public.identity_checks set status = 'its_me' where device_id = 'd1000000-0000-0000-0000-000000000004' and claimed_user_id = 'a0000000-0000-0000-0000-000000000001';
select is(
  (select status::text from public.identity_checks where device_id = 'd1000000-0000-0000-0000-000000000004' and claimed_user_id = 'a0000000-0000-0000-0000-000000000001'),
  'pending',
  'a phone can''t answer its own question'
);

-- =============================================================================
-- Phone E (Петър): IDOR
-- =============================================================================
set local request.jwt.claims = '{"sub": "e0000000-0000-0000-0000-000000000005", "role": "authenticated"}';

select is((select count(*)::int from public.identity_checks), 0,
  'IDOR: another person''s phone sees none of Мария''s questions');

-- =============================================================================
-- Cveta (family, not the one asked in the pending question)
-- =============================================================================
set local request.jwt.claims = '{"sub": "c0000000-0000-0000-0000-000000000003", "role": "authenticated"}';

select is((select count(*)::int from public.identity_checks), 3,
  'a family member reads every question about the person');

update public.identity_checks set status = 'not_me' where device_id = 'd1000000-0000-0000-0000-000000000004' and claimed_user_id = 'a0000000-0000-0000-0000-000000000001';
select is(
  (select status::text from public.identity_checks where device_id = 'd1000000-0000-0000-0000-000000000004' and claimed_user_id = 'a0000000-0000-0000-0000-000000000001'),
  'pending',
  'only the asked family member can answer (Cveta can''t answer Anna''s question)'
);

update public.identity_checks set status = 'not_me' where device_id = 'd1000000-0000-0000-0000-000000000004' and claimed_user_id = 'c0000000-0000-0000-0000-000000000003';
select is(
  (select status::text from public.identity_checks where device_id = 'd1000000-0000-0000-0000-000000000004' and claimed_user_id = 'c0000000-0000-0000-0000-000000000003'),
  'expired',
  'an expired question can''t be answered'
);

update public.identity_checks set status = 'not_me' where id = '1c000000-0000-0000-0000-000000000099';
select is(
  (select status::text from public.identity_checks where id = '1c000000-0000-0000-0000-000000000099'),
  'pending',
  'a question older than 15 minutes can''t be answered'
);

select throws_ok(
  $$ update public.identity_checks set answered_at = now() where id = '1c000000-0000-0000-0000-000000000099' $$,
  '42501', null,
  'nobody can write answered_at (no privilege)'
);

-- =============================================================================
-- Boris (stranger)
-- =============================================================================
set local request.jwt.claims = '{"sub": "b0000000-0000-0000-0000-000000000002", "role": "authenticated"}';

select is((select count(*)::int from public.identity_checks), 0,
  'IDOR: another family sees none of Мария''s questions');

update public.identity_checks set status = 'not_me' where device_id = 'd1000000-0000-0000-0000-000000000004' and claimed_user_id = 'a0000000-0000-0000-0000-000000000001';

-- =============================================================================
-- Anna (the claimed family member of the pending question)
-- =============================================================================
set local request.jwt.claims = '{"sub": "a0000000-0000-0000-0000-000000000001", "role": "authenticated"}';

select is(
  (select status::text from public.identity_checks where device_id = 'd1000000-0000-0000-0000-000000000004' and claimed_user_id = 'a0000000-0000-0000-0000-000000000001'),
  'pending',
  'IDOR: another family can''t answer the question'
);

select throws_ok(
  $$ update public.identity_checks set status = 'expired' where device_id = 'd1000000-0000-0000-0000-000000000004' and claimed_user_id = 'a0000000-0000-0000-0000-000000000001' $$,
  '42501', null,
  'the answer can only be not_me or its_me'
);

select throws_ok(
  $$ update public.identity_checks set claimed_user_id = 'b0000000-0000-0000-0000-000000000002'
     where device_id = 'd1000000-0000-0000-0000-000000000004' and claimed_user_id = 'a0000000-0000-0000-0000-000000000001' $$,
  '42501', null,
  'nobody can change who was asked (no privilege)'
);

update public.identity_checks set status = 'not_me' where device_id = 'd1000000-0000-0000-0000-000000000004' and claimed_user_id = 'a0000000-0000-0000-0000-000000000001';
select results_eq(
  $$ select status::text, answered_at is not null from public.identity_checks
     where device_id = 'd1000000-0000-0000-0000-000000000004' and claimed_user_id = 'a0000000-0000-0000-0000-000000000001' $$,
  $$ values ('not_me', true) $$,
  'the asked family member answers „Не съм аз“; the database writes answered_at'
);

update public.identity_checks set status = 'its_me' where device_id = 'd1000000-0000-0000-0000-000000000004' and claimed_user_id = 'a0000000-0000-0000-0000-000000000001';
select is(
  (select status::text from public.identity_checks where device_id = 'd1000000-0000-0000-0000-000000000004' and claimed_user_id = 'a0000000-0000-0000-0000-000000000001'),
  'not_me',
  'the answer can''t be changed afterwards (compare-and-set: only while pending)'
);

select throws_ok(
  $$ delete from public.identity_checks $$,
  '42501', null,
  'nobody can delete questions'
);

-- =============================================================================
-- Moderator, admin, guest
-- =============================================================================
set local request.jwt.claims = '{"sub": "f0000000-0000-0000-0000-000000000006", "role": "authenticated"}';
select is((select count(*)::int from public.identity_checks), 3,
  'a contact sees the questions about the person (RLS by family access)');

-- Without the contact row, a moderator sees nothing.
reset role;
delete from public.trusted_contacts where user_id = 'f0000000-0000-0000-0000-000000000006';
set local role authenticated;
set local request.jwt.claims = '{"sub": "f0000000-0000-0000-0000-000000000006", "role": "authenticated"}';
select is((select count(*)::int from public.identity_checks), 0,
  'a moderator who is not in the family sees no questions');

set local request.jwt.claims = '{"sub": "ad000000-0000-0000-0000-000000000007", "role": "authenticated"}';
select is((select count(*)::int from public.identity_checks), 3,
  'an admin reads all questions (time-to-answer statistics)');

update public.identity_checks set status = 'its_me' where id = '1c000000-0000-0000-0000-000000000099';
select is(
  (select status::text from public.identity_checks where id = '1c000000-0000-0000-0000-000000000099'),
  'pending',
  'an admin can''t answer in the name of a family member'
);

reset role;
set local role anon;
select throws_ok(
  $$ select count(*) from public.identity_checks $$,
  '42501', null,
  'a guest has no access at all'
);
reset role;

-- =============================================================================
-- The chain and the timestamps (as the superuser)
-- =============================================================================
select ok(
  (select answered_at >= created_at from public.identity_checks
   where device_id = 'd1000000-0000-0000-0000-000000000004' and claimed_user_id = 'a0000000-0000-0000-0000-000000000001'),
  'time-to-answer is answered_at - created_at (never negative)'
);

select throws_ok(
  $$ insert into public.identity_checks (protected_person_id, device_id, claimed_user_id, status)
     values ('a1000000-0000-0000-0000-000000000001', 'd1000000-0000-0000-0000-000000000004',
             'a0000000-0000-0000-0000-000000000001', 'not_me') $$,
  '23514', null,
  'an answer always has answered_at (CHECK constraint)'
);

select ok(
  (select p.prosecdef from pg_catalog.pg_proc p where p.proname = 'expire_previous_identity_check'),
  'the expiry trigger runs with the owner''s rights (a phone has no UPDATE right)'
);

select is(
  array(select tablename::text from pg_catalog.pg_publication_tables
        where pubname = 'supabase_realtime' and tablename = 'identity_checks'),
  array['identity_checks'],
  'identity_checks is published to Realtime'
);

-- =============================================================================
-- Claimed <> asked (migration 20261126000002): the caller says he is Anna,
-- Anna does not answer in 45 s, so the phone asks Cveta about ANNA.
-- =============================================================================
select has_column('public', 'identity_checks', 'asked_user_id',
  'identity_checks has asked_user_id (who is asked)');

select is(
  (select count(*)::int from public.identity_checks where asked_user_id <> claimed_user_id),
  0,
  'without asked_user_id the claimed person is asked (trigger default, old rows backfilled)'
);

set local role authenticated;
set local request.jwt.claims = '{"sub": "d0000000-0000-0000-0000-000000000004", "role": "authenticated"}';

select lives_ok(
  $$ insert into public.identity_checks (protected_person_id, device_id, claimed_user_id, asked_user_id)
     values ('a1000000-0000-0000-0000-000000000001', 'd1000000-0000-0000-0000-000000000004',
             'a0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000003') $$,
  'a phone can ask Cveta whether it is really Anna'
);

select throws_ok(
  $$ insert into public.identity_checks (protected_person_id, device_id, claimed_user_id, asked_user_id)
     values ('a1000000-0000-0000-0000-000000000001', 'd1000000-0000-0000-0000-000000000004',
             'a0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000002') $$,
  '42501', null,
  'IDOR: the asked person must be in the family too (not Boris)'
);

select throws_ok(
  $$ insert into public.identity_checks (protected_person_id, device_id, claimed_user_id, asked_user_id)
     values ('a1000000-0000-0000-0000-000000000001', 'd1000000-0000-0000-0000-000000000004',
             'b0000000-0000-0000-0000-000000000002', 'c0000000-0000-0000-0000-000000000003') $$,
  '42501', null,
  'IDOR: the claimed person must be in the family too (not Boris)'
);

select results_eq(
  $$ select claimed_user_id::text, asked_user_id::text, status::text from public.identity_checks
     where status = 'pending' $$,
  $$ values ('a0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000003', 'pending') $$,
  'the question keeps who is claimed (Anna) and who is asked (Cveta)'
);

-- Anna (claimed, not asked): may read, may not answer.
set local request.jwt.claims = '{"sub": "a0000000-0000-0000-0000-000000000001", "role": "authenticated"}';

select is(
  (select count(*)::int from public.identity_checks
   where claimed_user_id = 'a0000000-0000-0000-0000-000000000001'
     and asked_user_id = 'c0000000-0000-0000-0000-000000000003'),
  1,
  'the claimed family member can read the question asked to someone else'
);

update public.identity_checks set status = 'its_me'
where asked_user_id = 'c0000000-0000-0000-0000-000000000003' and status = 'pending';
reset role;
select is(
  (select status::text from public.identity_checks
   where claimed_user_id = 'a0000000-0000-0000-0000-000000000001'
     and asked_user_id = 'c0000000-0000-0000-0000-000000000003'),
  'pending',
  'IDOR: the claimed family member can''t answer a question asked to someone else'
);

-- Cveta (asked): answers.
set local role authenticated;
set local request.jwt.claims = '{"sub": "c0000000-0000-0000-0000-000000000003", "role": "authenticated"}';

select throws_ok(
  $$ update public.identity_checks set asked_user_id = 'a0000000-0000-0000-0000-000000000001'
     where asked_user_id = 'c0000000-0000-0000-0000-000000000003' and status = 'pending' $$,
  '42501', null,
  'nobody can change who is asked (no privilege)'
);

update public.identity_checks set status = 'not_me'
where asked_user_id = 'c0000000-0000-0000-0000-000000000003'
  and claimed_user_id = 'a0000000-0000-0000-0000-000000000001';
select results_eq(
  $$ select status::text, answered_at is not null from public.identity_checks
     where asked_user_id = 'c0000000-0000-0000-0000-000000000003'
       and claimed_user_id = 'a0000000-0000-0000-0000-000000000001' $$,
  $$ values ('not_me', true) $$,
  'the asked family member answers „Не е Анна“ (not_me)'
);

set local request.jwt.claims = '{"sub": "d0000000-0000-0000-0000-000000000004", "role": "authenticated"}';
select is(
  (select status::text from public.identity_checks
   where asked_user_id = 'c0000000-0000-0000-0000-000000000003'
     and claimed_user_id = 'a0000000-0000-0000-0000-000000000001'),
  'not_me',
  'the phone that asked sees the answer'
);
reset role;

select * from finish();
rollback;
