-- Claim the next family alert and record its Realtime delivery in one transaction.
alter table public.checks
  add column escalation_due_at timestamptz,
  add column escalation_exhausted_at timestamptz;

create index checks_escalation_due_idx
  on public.checks (escalation_due_at)
  where acknowledged_at is null and escalation_due_at is not null;

-- A delivery exists before a worker can move on to the next contact.
-- The locked check row also serializes this decision with acknowledgement.
create function public.claim_alert_escalations(p_check_id uuid default null)
returns table (
  check_id uuid,
  protected_person_id uuid,
  person_name text,
  recipient_id uuid,
  recipient_name text,
  risk_level public.risk_level,
  escalation_step smallint
)
language plpgsql
set search_path = ''
as $$
declare
  next_check record;
  next_contact record;
  next_step smallint;
  checked_at timestamptz := statement_timestamp();
begin
  for next_check in
    select c.id, c.protected_person_id, p.display_name, c.risk_level
    from public.checks c
    join public.protected_persons p on p.id = c.protected_person_id
    where c.acknowledged_at is null
      and c.escalation_due_at <= checked_at
      and (p_check_id is null or c.id = p_check_id)
    order by c.escalation_due_at, c.id
    limit 25
    for update of c skip locked
  loop
    select t.user_id, t.display_name into next_contact
    from public.trusted_contacts t
    join public.profiles recipient on recipient.id = t.user_id and recipient.role = 'family'
    where t.protected_person_id = next_check.protected_person_id
      and not exists (
        select 1 from public.alerts a
        where a.check_id = next_check.id
          and a.recipient_id = t.user_id and a.channel = 'realtime'
      )
    order by t.priority
    limit 1;

    if not found then
      update public.checks c
      set escalation_due_at = null, escalation_exhausted_at = checked_at
      where c.id = next_check.id;
      continue;
    end if;

    select coalesce(max(a.escalation_step) + 1, 0) into next_step
    from public.alerts a
    where a.check_id = next_check.id and a.channel = 'realtime';

    insert into public.alerts (check_id, recipient_id, channel, status, escalation_step, sent_at)
    values (next_check.id, next_contact.user_id, 'realtime', 'sent', next_step, checked_at);

    update public.checks c
    set escalation_due_at = checked_at + interval '2 minutes'
    where c.id = next_check.id;

    return query select next_check.id, next_check.protected_person_id, next_check.display_name,
      next_contact.user_id, next_contact.display_name, next_check.risk_level, next_step;
  end loop;
end;
$$;

revoke execute on function public.claim_alert_escalations(uuid) from public, anon, authenticated;
grant execute on function public.claim_alert_escalations(uuid) to service_role;
