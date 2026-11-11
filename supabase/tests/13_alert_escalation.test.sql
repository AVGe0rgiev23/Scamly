-- Checks the transactional escalation claim, its order and its service-role boundary.
begin;
select plan(9);

insert into auth.users (id, email) values
  ('aa130000-0000-0000-0000-000000000001', 'escalation-first@example.invalid'),
  ('aa130000-0000-0000-0000-000000000002', 'escalation-second@example.invalid');

insert into public.protected_persons (id, owner_id, display_name, district_code) values
  ('aa130000-0000-0000-0000-000000000003', 'aa130000-0000-0000-0000-000000000001', 'Мария', 'BG-02');

insert into public.trusted_contacts (protected_person_id, user_id, display_name, phone, priority) values
  ('aa130000-0000-0000-0000-000000000003', null, 'Пенка', '+359888123456', 2),
  ('aa130000-0000-0000-0000-000000000003', 'aa130000-0000-0000-0000-000000000002', 'Иван', null, 3);

insert into public.checks (id, protected_person_id, escalation_due_at) values
  ('aa130000-0000-0000-0000-000000000004', 'aa130000-0000-0000-0000-000000000003', now()),
  ('aa130000-0000-0000-0000-000000000005', 'aa130000-0000-0000-0000-000000000003', null);

set local role authenticated;
select throws_ok(
  $$select * from public.claim_alert_escalations()$$,
  '42501', null, 'signed-in users cannot claim alerts'
);
reset role;

set local role service_role;
select is(
  (select recipient_id from public.claim_alert_escalations('aa130000-0000-0000-0000-000000000004')),
  'aa130000-0000-0000-0000-000000000001'::uuid,
  'first due claim alerts the owner'
);
select is(
  (select count(*) from public.claim_alert_escalations('aa130000-0000-0000-0000-000000000004')),
  0::bigint, 'an immediate retry does not alert another contact'
);

update public.checks set escalation_due_at = now()
where id = 'aa130000-0000-0000-0000-000000000004';
select is(
  (select recipient_id from public.claim_alert_escalations('aa130000-0000-0000-0000-000000000004')),
  'aa130000-0000-0000-0000-000000000002'::uuid,
  'after the wait the next account receives the alert, skipping the phone-only contact'
);
select results_eq(
  $$select escalation_step from public.alerts
    where check_id = 'aa130000-0000-0000-0000-000000000004' and channel = 'realtime'
    order by escalation_step$$,
  $$values (0::smallint), (1::smallint)$$,
  'each claimed recipient has one durable Realtime alert'
);

update public.checks set escalation_due_at = now()
where id = 'aa130000-0000-0000-0000-000000000004';
select is(
  (select count(*) from public.claim_alert_escalations('aa130000-0000-0000-0000-000000000004')),
  0::bigint, 'an exhausted chain sends no further alert'
);
select ok(
  (select escalation_due_at is null and escalation_exhausted_at is not null from public.checks
    where id = 'aa130000-0000-0000-0000-000000000004'),
  'an exhausted chain records the fallback and leaves the queue'
);

select is(
  (select count(*) from public.claim_alert_escalations('aa130000-0000-0000-0000-000000000005')),
  0::bigint, 'existing fan-out checks are not queued'
);
update public.checks
set escalation_due_at = now(),
    acknowledged_at = now(),
    acknowledged_by = 'aa130000-0000-0000-0000-000000000001'
where id = 'aa130000-0000-0000-0000-000000000005';
select is(
  (select count(*) from public.claim_alert_escalations('aa130000-0000-0000-0000-000000000005')),
  0::bigint, 'acknowledged checks are never escalated'
);

select * from finish();
rollback;
