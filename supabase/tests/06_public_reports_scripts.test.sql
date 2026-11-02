-- =============================================================================
-- 06_public_reports_scripts: what guests can see, reports and moderation,
-- the education cards (scam_scripts) and get_map_stats().
--   * a guest reads districts and PUBLISHED scripts, and calls get_map_stats,
--     but can't read or insert reports
--   * the map counts only APPROVED reports from the last N weeks (1..12)
--   * a moderator can approve a report, a family member can't
--   * a moderator can change only the moderation columns of a report
--   * moderators manage scripts, only admins delete
-- =============================================================================
begin;
select plan(22);

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

-- 3 approved "police" reports in Бургас today, 1 approved "courier" in Варна
-- 10 days ago, 1 pending, 1 rejected, and 1 approved but 20 weeks old.
insert into public.reports (id, district_code, script_type, occurred_on, status, description_redacted) values
  ('7e000000-0000-0000-0000-000000000001', 'BG-02', 'police',  current_date,       'approved', 'Обади се „полицай“'),
  ('7e000000-0000-0000-0000-000000000002', 'BG-02', 'police',  current_date,       'approved', null),
  ('7e000000-0000-0000-0000-000000000003', 'BG-02', 'police',  current_date,       'approved', null),
  ('7e000000-0000-0000-0000-000000000004', 'BG-03', 'courier', current_date - 10,  'approved', null),
  ('7e000000-0000-0000-0000-000000000005', 'BG-02', 'police',  current_date,       'pending',  'Чака проверка'),
  ('7e000000-0000-0000-0000-000000000006', 'BG-02', 'police',  current_date,       'rejected', 'Спам'),
  ('7e000000-0000-0000-0000-000000000007', 'BG-02', 'police',  current_date - 140, 'approved', null);

insert into public.scam_scripts (id, slug, script_type, title_bg, how_it_starts_bg, what_they_say_bg, what_to_do_bg, published) values
  ('5c000000-0000-0000-0000-000000000001', 'politsai', 'police', 'Фалшив полицай', 'Звъни „полицай“', 'Помогнете да хванем измамници', 'Затворете', true),
  ('5c000000-0000-0000-0000-000000000002', 'kurier',   'courier', 'Куриер (чернова)', '...', '...', '...', false);

-- =============================================================================
-- Guest (anon)
-- =============================================================================
set local role anon;
set local request.jwt.claims = '{"role": "anon"}';

select is((select count(*)::int from public.districts), 28, 'a guest can read the 28 districts');

select results_eq(
  $$ select slug from public.scam_scripts $$,
  $$ values ('politsai') $$,
  'a guest sees only published scripts'
);

select throws_ok($$ select * from public.reports $$, '42501', null, 'a guest can''t read the reports table');

select throws_ok(
  $$ insert into public.reports (district_code, script_type, occurred_on) values ('BG-02', 'police', current_date) $$,
  '42501', null,
  'a guest can''t insert reports directly (must go through the rate-limited API)'
);

select throws_ok(
  $$ insert into public.scam_scripts (slug, script_type, title_bg, how_it_starts_bg, what_they_say_bg, what_to_do_bg)
     values ('spam', 'police', 'x', 'x', 'x', 'x') $$,
  '42501', null,
  'a guest can''t create scripts'
);

select results_eq(
  $$ select district_code, script_type::text, report_count from public.get_map_stats(4) order by district_code $$,
  $$ values ('BG-02', 'police', 3::bigint), ('BG-03', 'courier', 1::bigint) $$,
  'a guest can call get_map_stats: only approved reports of the last 4 weeks are counted'
);

select is(
  (select sum(report_count)::int from public.get_map_stats(1)),
  3,
  'get_map_stats(1) counts only the last 7 days'
);

select is(
  (select sum(report_count)::int from public.get_map_stats(1000)),
  4,
  'get_map_stats clamps weeks to 12, so the 20-week-old report is not counted'
);

select is(
  (select sum(report_count)::int from public.get_map_stats(0)),
  3,
  'get_map_stats clamps weeks below 1 to 1'
);

select is(
  (select week_start from public.get_map_stats(1) limit 1),
  date_trunc('week', current_date::timestamp)::date,
  'week_start is the Monday of the week'
);

-- =============================================================================
-- Family member: no access to reports, published scripts only
-- =============================================================================
reset role;
set local role authenticated;
set local request.jwt.claims = '{"sub": "a0000000-0000-0000-0000-000000000001", "role": "authenticated"}';

select is((select count(*)::int from public.reports), 0, 'family sees no reports');
select is((select count(*)::int from public.scam_scripts), 1, 'family sees only published scripts');

-- Family tries to approve the pending report: RLS hides it, 0 rows change.
update public.reports set status = 'approved' where id = '7e000000-0000-0000-0000-000000000005';

-- =============================================================================
-- Moderator
-- =============================================================================
set local request.jwt.claims = '{"sub": "f0000000-0000-0000-0000-000000000006", "role": "authenticated"}';

select is((select count(*)::int from public.reports), 7, 'a moderator sees all reports');

select is(
  (select status::text from public.reports where id = '7e000000-0000-0000-0000-000000000005'),
  'pending',
  'family could not approve a report'
);

update public.reports
set status = 'approved', reviewed_by = 'f0000000-0000-0000-0000-000000000006', reviewed_at = now()
where id = '7e000000-0000-0000-0000-000000000005';

select is(
  (select status::text from public.reports where id = '7e000000-0000-0000-0000-000000000005'),
  'approved',
  'a moderator can approve a report'
);

select throws_ok(
  $$ update public.reports set description_redacted = 'rewritten' where id = '7e000000-0000-0000-0000-000000000001' $$,
  '42501', null,
  'a moderator can change only the moderation columns, not the report text'
);

-- Moderator tries to delete a report: only admins may, so 0 rows are deleted.
delete from public.reports where id = '7e000000-0000-0000-0000-000000000006';
select is((select count(*)::int from public.reports), 7, 'a moderator can''t delete reports');

select is((select count(*)::int from public.scam_scripts), 2, 'a moderator sees all scripts, also drafts');

update public.scam_scripts set published = true where id = '5c000000-0000-0000-0000-000000000002';
select is(
  (select published from public.scam_scripts where id = '5c000000-0000-0000-0000-000000000002'),
  true,
  'a moderator can publish a script'
);

select lives_ok(
  $$ insert into public.scam_scripts (slug, script_type, title_bg, how_it_starts_bg, what_they_say_bg, what_to_do_bg, updated_by)
     values ('nap', 'fake_official', 'Фалшив служител на НАП', '...', '...', '...', 'f0000000-0000-0000-0000-000000000006') $$,
  'a moderator can create a script'
);

-- =============================================================================
-- Admin
-- =============================================================================
set local request.jwt.claims = '{"sub": "ad000000-0000-0000-0000-000000000007", "role": "authenticated"}';

delete from public.reports where id = '7e000000-0000-0000-0000-000000000006';
select is((select count(*)::int from public.reports), 6, 'an admin can delete a report');

delete from public.scam_scripts where slug = 'nap';
select is((select count(*)::int from public.scam_scripts), 2, 'an admin can delete a script');

select * from finish();
rollback;
