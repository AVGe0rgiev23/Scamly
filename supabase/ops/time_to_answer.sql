-- Time-to-answer of „Провери истинския“ (P-09, IDEAS #7): evidence for the slides.
-- READ-ONLY: one SELECT, it changes nothing. Paste it into the Supabase SQL Editor
-- (or run `psql -f supabase/ops/time_to_answer.sql`) after rehearsals and family tests.
--
-- Counts only answered questions (status not_me / its_me with answered_at set);
-- the seconds are answered_at - created_at, both written by the database itself
-- (created_at = default now(), answered_at = trigger), so no phone clock is involved.
-- To count only from a date on, change the date in `since` (e.g. the first rehearsal).
-- Not a migration: this file lives in supabase/ops/, which no tool applies.

with since as (
  select timestamptz '2026-11-01 00:00:00+02' as from_time
),
answered as (
  select
    status,
    extract(epoch from (answered_at - created_at)) as seconds
  from public.identity_checks, since
  where status in ('not_me', 'its_me')
    and answered_at is not null
    and created_at >= since.from_time
)
select
  count(*) as answered_count,
  count(*) filter (where status = 'not_me') as not_me_count,
  count(*) filter (where status = 'its_me') as its_me_count,
  round((percentile_cont(0.5) within group (order by seconds))::numeric, 1) as median_seconds,
  round((percentile_cont(0.9) within group (order by seconds))::numeric, 1) as p90_seconds,
  round(min(seconds)::numeric, 1) as fastest_seconds,
  round(max(seconds)::numeric, 1) as slowest_seconds
from answered;
