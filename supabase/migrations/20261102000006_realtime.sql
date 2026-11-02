-- =============================================================================
-- Migration 6: Realtime
--
-- Supabase Realtime sends live changes of the tables in the publication
-- "supabase_realtime" to subscribed browsers. We add only:
--   * checks: the family's live status page, and the older person's phone
--             ("Иван ще ви се обади веднага" after acknowledge)
--   * alerts: a new alert pops up for the family member immediately
--
-- Realtime applies the RLS policies of migration 4 to every subscriber, so a
-- family member only receives changes for people they are linked to.
--
-- The publication is created by Supabase. The IF EXISTS guard only matters
-- when these migrations run on a plain PostgreSQL without it.
-- =============================================================================
do $$
begin
  if exists (select 1 from pg_catalog.pg_publication where pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table public.checks, public.alerts;
  end if;
end;
$$;
