-- Deleting one synthetic owner removes their data and paired login, while other
-- families retain their records. The transaction rolls back the fixtures.
begin;
select plan(6);

insert into auth.users (id, email) values
  ('14000000-0000-0000-0000-000000000001', 'owner-w4@example.test'),
  ('14000000-0000-0000-0000-000000000002', 'device-w4@example.test'),
  ('14000000-0000-0000-0000-000000000003', 'other-w4@example.test');

update public.profiles set role = 'protected'
where id = '14000000-0000-0000-0000-000000000002';

insert into public.protected_persons (id, owner_id, display_name, district_code) values
  ('14000000-0000-0000-0000-000000000011', '14000000-0000-0000-0000-000000000001', 'Demo one', 'BG-02'),
  ('14000000-0000-0000-0000-000000000012', '14000000-0000-0000-0000-000000000003', 'Demo two', 'BG-02');
insert into public.devices (id, protected_person_id, user_id) values
  ('14000000-0000-0000-0000-000000000021', '14000000-0000-0000-0000-000000000011', '14000000-0000-0000-0000-000000000002');
insert into public.checks (id, protected_person_id, device_id) values
  ('14000000-0000-0000-0000-000000000031', '14000000-0000-0000-0000-000000000011', '14000000-0000-0000-0000-000000000021');

delete from auth.users where id = '14000000-0000-0000-0000-000000000001';

select is((select count(*)::int from public.profiles where id = '14000000-0000-0000-0000-000000000001'), 0, 'owner profile removed');
select is((select count(*)::int from public.protected_persons where id = '14000000-0000-0000-0000-000000000011'), 0, 'owned person removed');
select is((select count(*)::int from public.devices where id = '14000000-0000-0000-0000-000000000021'), 0, 'device removed');
select is((select count(*)::int from auth.users where id = '14000000-0000-0000-0000-000000000002'), 0, 'paired login removed');
select is((select count(*)::int from public.checks where id = '14000000-0000-0000-0000-000000000031'), 0, 'owned check removed');
select is((select count(*)::int from public.protected_persons where id = '14000000-0000-0000-0000-000000000012'), 1, 'unrelated person retained');

select * from finish();
rollback;
