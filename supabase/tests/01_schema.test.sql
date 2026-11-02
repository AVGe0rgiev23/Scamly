-- =============================================================================
-- 01_schema: the structure is what BUILD_PLAN section 2 says.
--   * all tables and enums exist
--   * RLS is switched on for EVERY table in public
--   * the 28 districts are seeded with the right codes and names
--   * the important indexes exist
--   * only checks and alerts are in the Realtime publication
--   * CHECK constraints reject bad values (score 101, 61-char name ...)
-- =============================================================================
begin;
select plan(21);

-- Start from empty tables, so the exact counts below also hold when the local
-- database already has demo data. Everything in this file runs inside one
-- transaction that is rolled back at the end, so nothing is really deleted.
delete from auth.users;   -- cascades to profiles, persons, contacts, devices, checks, alerts...
delete from public.reports;
delete from public.scam_scripts;
delete from public.audit_log;

-- --- Tables and enums ----------------------------------------------------------
select tables_are(
  'public',
  array[
    'profiles', 'protected_persons', 'trusted_contacts', 'contact_invites',
    'pairing_codes', 'devices', 'checks', 'alerts', 'push_subscriptions',
    'districts', 'reports', 'scam_scripts', 'audit_log', 'rate_limits'
  ],
  'public schema has exactly the 14 Scamly tables'
);

select enums_are(
  'public',
  array[
    'app_role', 'claimed_identity', 'tri', 'handover_method', 'risk_level',
    'script_type', 'check_status', 'alert_channel', 'alert_status', 'report_status'
  ],
  'public schema has exactly the 10 enums from BUILD_PLAN 2.2'
);

select enum_has_labels('public', 'app_role', array['family', 'protected', 'moderator', 'admin'],
  'app_role has the four roles');

-- --- RLS on every table -----------------------------------------------------------
select is(
  (select count(*)::int
   from pg_catalog.pg_class c
   join pg_catalog.pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'public' and c.relkind = 'r' and not c.relrowsecurity),
  0,
  'every table in public has row level security enabled'
);

-- --- Districts ------------------------------------------------------------------
select is((select count(*)::int from public.districts), 28, 'there are 28 districts');

select is(
  (select count(*)::int from public.districts
   where code in (select 'BG-' || lpad(n::text, 2, '0') from generate_series(1, 28) as n)),
  28,
  'district codes are exactly BG-01 ... BG-28'
);

select results_eq(
  $$ select code, name_bg from public.districts where code in ('BG-01', 'BG-02', 'BG-22', 'BG-23', 'BG-28') order by code $$,
  $$ values ('BG-01', 'Благоевград'), ('BG-02', 'Бургас'), ('BG-22', 'София (столица)'),
            ('BG-23', 'София (област)'), ('BG-28', 'Ямбол') $$,
  'district names are correct (spot check)'
);

-- --- Indexes from BUILD_PLAN 2.3 ------------------------------------------------
select has_index('public', 'protected_persons', 'protected_persons_owner_id_idx', 'index protected_persons(owner_id)');
select has_index('public', 'checks', 'checks_person_started_idx', 'index checks(protected_person_id, started_at desc)');
select has_index('public', 'alerts', 'alerts_recipient_created_idx', 'index alerts(recipient_id, created_at desc)');
select has_index('public', 'reports', 'reports_approved_district_date_idx', 'partial index for approved reports');
select has_index('public', 'pairing_codes', 'pairing_codes_unused_code_hash_key', 'partial unique index on unused pairing codes');

-- --- Realtime publication ---------------------------------------------------------
select is(
  array(select tablename::text from pg_catalog.pg_publication_tables
        where pubname = 'supabase_realtime' order by 1),
  array['alerts', 'checks'],
  'only checks and alerts are published to Realtime'
);

-- --- CHECK constraints ------------------------------------------------------------
-- Test data (as the superuser, so RLS does not get in the way here).
insert into auth.users (id, email) values ('a0000000-0000-0000-0000-000000000001', 'anna@example.com');
insert into public.protected_persons (id, owner_id, display_name, district_code)
values ('a1000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'Баба Мария', 'BG-02');

select throws_ok(
  $$ update public.profiles set display_name = repeat('я', 61) where id = 'a0000000-0000-0000-0000-000000000001' $$,
  '23514', null,
  'a 61-character display name is rejected'
);

select throws_ok(
  $$ update public.profiles set display_name = '' where id = 'a0000000-0000-0000-0000-000000000001' $$,
  '23514', null,
  'an empty display name is rejected'
);

select throws_ok(
  $$ insert into public.checks (protected_person_id, status, score, risk_level)
     values ('a1000000-0000-0000-0000-000000000001', 'answered', 101, 'red') $$,
  '23514', null,
  'a score of 101 is rejected'
);

select throws_ok(
  $$ insert into public.checks (protected_person_id, text_redacted)
     values ('a1000000-0000-0000-0000-000000000001', repeat('a', 2001)) $$,
  '23514', null,
  'text_redacted longer than 2000 characters is rejected'
);

select throws_ok(
  $$ insert into public.checks (protected_person_id, status) values ('a1000000-0000-0000-0000-000000000001', 'answered') $$,
  '23514', null,
  'an answered check without a verdict is rejected'
);

select throws_ok(
  $$ insert into public.trusted_contacts (protected_person_id, display_name, priority)
     values ('a1000000-0000-0000-0000-000000000001', 'Иван', 6) $$,
  '23514', null,
  'contact priority 6 is rejected (allowed 1-5)'
);

select throws_ok(
  $$ insert into public.reports (district_code, script_type, occurred_on, description_redacted)
     values ('BG-02', 'police', current_date, repeat('a', 1001)) $$,
  '23514', null,
  'a report description longer than 1000 characters is rejected'
);

select throws_ok(
  $$ insert into public.reports (district_code, script_type, occurred_on)
     values ('BG-99', 'police', current_date) $$,
  '23503', null,
  'a report for an unknown district is rejected (foreign key)'
);

select * from finish();
rollback;
