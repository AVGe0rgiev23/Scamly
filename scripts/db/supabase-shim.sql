-- =============================================================================
-- supabase-shim.sql: a tiny fake of the parts of Supabase our migrations use.
--
-- ONLY FOR LOCAL TESTS ON PLAIN POSTGRESQL. NEVER RUN THIS ON REAL SUPABASE.
--
-- Why it exists: the normal way to test is `supabase start` + `supabase test
-- db`, which needs Docker. When Docker is not available (e.g. in a sandbox),
-- scripts/db/test-local.sh starts a plain PostgreSQL instead, runs this file,
-- then our migrations and the pgTAP tests.
--
-- It creates what a real Supabase project already has:
--   * the roles anon, authenticated, service_role
--   * the schema auth with a minimal auth.users table
--   * auth.uid(), auth.role(), auth.jwt() that read the JWT claims exactly the
--     way Supabase does (from the setting request.jwt.claims)
--   * Supabase's default privileges (anon/authenticated get rights on new
--     tables in public; RLS is the real gate). Our migrations revoke them.
--   * the publication supabase_realtime
--   * the pgTAP extension for the tests
-- =============================================================================


-- -----------------------------------------------------------------------------
-- Roles. NOLOGIN: nobody logs in as them directly; in Supabase the API
-- gateway switches to one of them for every request ("set role").
-- service_role has BYPASSRLS, like in Supabase.
-- -----------------------------------------------------------------------------
create role anon nologin noinherit;
create role authenticated nologin noinherit;
create role service_role nologin noinherit bypassrls;


-- -----------------------------------------------------------------------------
-- Schema auth and a minimal auth.users (the real one has many more columns;
-- our migrations and tests only use these).
-- -----------------------------------------------------------------------------
create schema auth;

create table auth.users (
  id                 uuid primary key default gen_random_uuid(),
  email              text unique,
  raw_user_meta_data jsonb default '{}'::jsonb,
  created_at         timestamptz not null default now()
);


-- -----------------------------------------------------------------------------
-- auth.uid() / auth.role() / auth.jwt(): same definitions as in Supabase.
-- The request's JWT claims are stored in the setting request.jwt.claims
-- (as JSON); older Supabase versions used request.jwt.claim.sub, so we
-- read both, like Supabase does.
-- -----------------------------------------------------------------------------
create function auth.uid()
returns uuid
language sql
stable
as $$
  select coalesce(
    nullif(current_setting('request.jwt.claim.sub', true), ''),
    (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub')
  )::uuid
$$;

create function auth.role()
returns text
language sql
stable
as $$
  select coalesce(
    nullif(current_setting('request.jwt.claim.role', true), ''),
    (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'role')
  )::text
$$;

create function auth.jwt()
returns jsonb
language sql
stable
as $$
  select coalesce(
    nullif(current_setting('request.jwt.claim', true), ''),
    nullif(current_setting('request.jwt.claims', true), '')
  )::jsonb
$$;


-- -----------------------------------------------------------------------------
-- Schema usage and Supabase's default privileges.
-- -----------------------------------------------------------------------------
grant usage on schema auth to anon, authenticated, service_role;
grant execute on function auth.uid(), auth.role(), auth.jwt() to anon, authenticated, service_role;

grant usage on schema public to anon, authenticated, service_role;

alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
alter default privileges in schema public grant all on sequences to anon, authenticated, service_role;
alter default privileges in schema public grant all on functions to anon, authenticated, service_role;


-- -----------------------------------------------------------------------------
-- Realtime publication (empty; migration 6 adds our tables to it).
-- -----------------------------------------------------------------------------
create publication supabase_realtime;


-- -----------------------------------------------------------------------------
-- pgTAP, the unit-testing framework for PostgreSQL used by our tests.
-- (On Supabase: enabled by `supabase test db`, or in the dashboard.)
-- -----------------------------------------------------------------------------
create extension if not exists pgtap;
