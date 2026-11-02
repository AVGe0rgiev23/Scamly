-- =============================================================================
-- 08_functions: hit_rate_limit() and the RLS helper functions.
--   * hit_rate_limit allows N calls, blocks call N+1, keys are independent
--   * only the server (service_role) may call hit_rate_limit
--   * old windows are deleted (privacy)
--   * helper functions answer correctly for each kind of user
--   * every SECURITY DEFINER function pins search_path
-- =============================================================================
begin;
select plan(18);

-- Start from empty tables, so the exact counts below also hold when the local
-- database already has demo data. Everything in this file runs inside one
-- transaction that is rolled back at the end, so nothing is really deleted.
delete from auth.users;   -- cascades to profiles, persons, contacts, devices, checks, alerts...
delete from public.reports;
delete from public.scam_scripts;
delete from public.audit_log;

-- =============================================================================
-- hit_rate_limit (as the server). Inside one transaction now() does not
-- change, so all calls fall into the same time window.
-- =============================================================================
set local role service_role;

select is(public.hit_rate_limit('pair:ip:test', 3, 900), true,  'rate limit: call 1 of 3 is allowed');
select is(public.hit_rate_limit('pair:ip:test', 3, 900), true,  'rate limit: call 2 of 3 is allowed');
select is(public.hit_rate_limit('pair:ip:test', 3, 900), true,  'rate limit: call 3 of 3 is allowed');
select is(public.hit_rate_limit('pair:ip:test', 3, 900), false, 'rate limit: call 4 is blocked');
select is(public.hit_rate_limit('pair:ip:other', 3, 900), true, 'rate limit: another key has its own counter');

select throws_ok(
  $$ select public.hit_rate_limit('pair:ip:test', 0, 900) $$,
  '22023', null,
  'rate limit: max_hits below 1 is rejected'
);

reset role;

select is(
  (select hits from public.rate_limits where key = 'pair:ip:test'),
  4,
  'rate limit: the blocked call was still counted'
);

-- A window that started 2 hours ago is deleted by the next call.
insert into public.rate_limits (key, window_start, hits) values ('old:key', now() - interval '2 hours', 5);
select is(public.hit_rate_limit('pair:ip:test', 3, 900), false, 'rate limit: call 5 is still blocked');
select is(
  (select count(*)::int from public.rate_limits where key = 'old:key'),
  0,
  'rate limit: windows older than 1 hour are cleaned up'
);

-- Only the server may call it.
set local role authenticated;
set local request.jwt.claims = '{"sub": "a0000000-0000-0000-0000-000000000001", "role": "authenticated"}';
select throws_ok(
  $$ select public.hit_rate_limit('pair:ip:test', 1000, 900) $$,
  '42501', null,
  'a logged-in user can''t call hit_rate_limit'
);

reset role;
set local role anon;
set local request.jwt.claims = '{"role": "anon"}';
select throws_ok(
  $$ select public.hit_rate_limit('pair:ip:test', 1000, 900) $$,
  '42501', null,
  'a guest can''t call hit_rate_limit (e.g. to reset or fill someone''s limit)'
);
reset role;

-- =============================================================================
-- Who may execute which function
-- =============================================================================
select is(
  has_function_privilege('anon', 'public.get_map_stats(integer)', 'execute'),
  true,
  'guests may call get_map_stats'
);

select is(
  has_function_privilege('anon', 'public.is_admin()', 'execute'),
  false,
  'guests may not call the RLS helper functions'
);

-- =============================================================================
-- RLS helper functions give the right answers
-- =============================================================================
insert into auth.users (id, email) values
  ('a0000000-0000-0000-0000-000000000001', 'anna@example.com'),
  ('c0000000-0000-0000-0000-000000000003', 'cveta@example.com'),
  ('f0000000-0000-0000-0000-000000000006', 'mod@example.com'),
  ('ad000000-0000-0000-0000-000000000007', 'admin@example.com');
update public.profiles set role = 'moderator' where id = 'f0000000-0000-0000-0000-000000000006';
update public.profiles set role = 'admin'     where id = 'ad000000-0000-0000-0000-000000000007';
insert into public.protected_persons (id, owner_id, display_name, district_code)
values ('a1000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'Баба Мария', 'BG-02');

set local role authenticated;

set local request.jwt.claims = '{"sub": "f0000000-0000-0000-0000-000000000006", "role": "authenticated"}';
select results_eq(
  $$ select public.app_role()::text, public.is_moderator(), public.is_admin() $$,
  $$ values ('moderator', true, false) $$,
  'moderator: is_moderator() true, is_admin() false'
);

set local request.jwt.claims = '{"sub": "ad000000-0000-0000-0000-000000000007", "role": "authenticated"}';
select results_eq(
  $$ select public.is_moderator(), public.is_admin() $$,
  $$ values (true, true) $$,
  'admin: is_moderator() and is_admin() are both true'
);

set local request.jwt.claims = '{"sub": "a0000000-0000-0000-0000-000000000001", "role": "authenticated"}';
select results_eq(
  $$ select public.is_owner_of('a1000000-0000-0000-0000-000000000001'),
            public.has_family_access('a1000000-0000-0000-0000-000000000001'),
            public.is_device_of('a1000000-0000-0000-0000-000000000001') $$,
  $$ values (true, true, false) $$,
  'owner: is_owner_of and has_family_access true, is_device_of false'
);

set local request.jwt.claims = '{"sub": "c0000000-0000-0000-0000-000000000003", "role": "authenticated"}';
select results_eq(
  $$ select public.is_owner_of('a1000000-0000-0000-0000-000000000001'),
            public.has_family_access('a1000000-0000-0000-0000-000000000001') $$,
  $$ values (false, false) $$,
  'a stranger has no access'
);

reset role;

-- =============================================================================
-- Every SECURITY DEFINER function in public sets search_path = ''
-- =============================================================================
select is(
  array(
    select p.proname::text
    from pg_catalog.pg_proc p
    join pg_catalog.pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.prosecdef
      and not coalesce('search_path=""' = any(p.proconfig), false)
  ),
  array[]::text[],
  'every SECURITY DEFINER function in public has search_path = '''''
);

select * from finish();
rollback;
