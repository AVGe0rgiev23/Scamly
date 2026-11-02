-- =============================================================================
-- Migration 5: database functions used by the API
--
--   get_map_stats(weeks)  -> numbers for the public scam map
--   hit_rate_limit(...)   -> the rate limiter (pairing codes, public reports)
-- =============================================================================


-- -----------------------------------------------------------------------------
-- get_map_stats(weeks): how many APPROVED reports there were per district,
-- per scam script and per week, over the last `weeks` weeks (1 to 12).
--
-- Guests can't read the reports table at all. This function is their only
-- window into it, and it returns ONLY counts: no descriptions, no dates of a
-- single report, no caller hashes. That is why it is SECURITY DEFINER: it
-- reads reports with the owner's rights, but hands out only the aggregate.
--
-- `weeks` outside 1..12 is clamped (0 -> 1, 50 -> 12, null -> 4), so nobody
-- can ask for the whole history in one call.
-- week_start is the Monday of the week the scam call happened.
-- -----------------------------------------------------------------------------
create function public.get_map_stats(weeks integer default 4)
returns table (
  district_code text,
  script_type   public.script_type,
  week_start    date,
  report_count  bigint
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    r.district_code,
    r.script_type,
    date_trunc('week', r.occurred_on::timestamp)::date as week_start,
    count(*) as report_count
  from public.reports as r
  where r.status = 'approved'
    and r.occurred_on <= current_date
    and r.occurred_on > current_date - 7 * least(greatest(coalesce(weeks, 4), 1), 12)
  group by r.district_code, r.script_type, week_start
  order by week_start, r.district_code, r.script_type;
$$;

-- Everyone may call it, guests included (the map is public).
revoke execute on function public.get_map_stats(integer) from public;
grant execute on function public.get_map_stats(integer) to anon, authenticated, service_role;


-- -----------------------------------------------------------------------------
-- hit_rate_limit(key, max_hits, window_seconds): count one attempt for `key`
-- and say whether it is ALLOWED (true) or over the limit (false).
--
-- Example: hit_rate_limit('pair:ip:<hmac>', 5, 900) allows 5 attempts per
-- 15 minutes; the 6th returns false and the API answers 429.
--
-- How it works ("fixed window"): time is cut into blocks of window_seconds,
-- e.g. 10:00-10:15, 10:15-10:30. Each (key, block) has one row in
-- rate_limits with a hit counter.
--
-- Why it is safe when many requests arrive at the same moment:
-- INSERT ... ON CONFLICT DO UPDATE is ONE atomic statement. Two parallel
-- calls can't both read "4 hits" and both write "5": PostgreSQL locks the row,
-- so the second call waits and then counts 6.
--
-- Clean-up: every call also deletes windows that started more than 1 hour
-- ago. Windows are at most 1 hour long, so those windows are over anyway, and
-- an IP hash is never kept much longer than an hour (BUILD_PLAN 2.3).
-- -----------------------------------------------------------------------------
create function public.hit_rate_limit(p_key text, p_max_hits integer, p_window_seconds integer)
returns boolean
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_window_start timestamptz;
  v_hits         integer;
begin
  -- Reject nonsense arguments instead of silently allowing everything.
  if p_key is null or p_key = '' then
    raise exception 'hit_rate_limit: key must not be empty'
      using errcode = '22023';  -- invalid_parameter_value
  end if;
  if p_max_hits is null or p_max_hits < 1 then
    raise exception 'hit_rate_limit: max_hits must be at least 1'
      using errcode = '22023';
  end if;
  if p_window_seconds is null or p_window_seconds < 1 or p_window_seconds > 3600 then
    raise exception 'hit_rate_limit: window_seconds must be between 1 and 3600'
      using errcode = '22023';
  end if;

  -- Start of the current window: round "seconds since 1970" down to a
  -- multiple of the window length. E.g. 900 s windows start at :00, :15, :30, :45.
  v_window_start := to_timestamp(
    floor(extract(epoch from now()) / p_window_seconds) * p_window_seconds
  );

  -- Count this hit (atomic, see above).
  insert into public.rate_limits as rl (key, window_start, hits)
  values (p_key, v_window_start, 1)
  on conflict (key, window_start)
  do update set hits = rl.hits + 1
  returning rl.hits into v_hits;

  -- Forget windows that are over (privacy + keeps the table small).
  delete from public.rate_limits
  where window_start < now() - interval '1 hour';

  return v_hits <= p_max_hits;
end;
$$;

-- Only our server may call it. If guests could call it, they could fill the
-- table with junk keys or use up someone else's limit.
revoke execute on function public.hit_rate_limit(text, integer, integer) from public, anon, authenticated;
grant execute on function public.hit_rate_limit(text, integer, integer) to service_role;
