-- =============================================================================
-- 11_replace_contacts: replace_trusted_contacts(person, contacts), the function
-- behind PUT /api/persons/:id/contacts (migration 20261104000002).
--   * the owner can rename, reorder (swap places), add and remove contacts in one call
--   * a full rotation of 5 places works (the unique rule is checked per statement)
--   * existing contacts keep their account (user_id); new ones never get one
--   * the owner's own row can't be removed; unknown ids and taken places are refused
--   * a non-owner trusted contact, a stranger and a guest can't use it
-- =============================================================================
begin;
select plan(20);

-- Start from empty tables (rolled back at the end, so nothing is really deleted).
delete from auth.users;   -- cascades to profiles, persons, contacts, devices...
delete from public.audit_log;

-- --- Test data (as the superuser) ----------------------------------------------
-- A = Anna (owner of Баба Мария), B = Boris (owner of Дядо Петър),
-- C = Cveta (trusted contact of Баба Мария with an account, not the owner).
insert into auth.users (id, email, raw_user_meta_data) values
  ('a0000000-0000-0000-0000-000000000001', 'anna@example.com',  '{"display_name": "Анна"}'),
  ('b0000000-0000-0000-0000-000000000002', 'boris@example.com', '{"display_name": "Борис"}'),
  ('c0000000-0000-0000-0000-000000000003', 'cveta@example.com', '{"display_name": "Цвета"}');

insert into public.protected_persons (id, owner_id, display_name, district_code) values
  ('a1000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'Баба Мария', 'BG-02'),
  ('b1000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000002', 'Дядо Петър', 'BG-16');

-- The trigger made Anna contact #1 of Баба Мария. Fixed ids for the other contacts:
-- 'cc…' = Cveta (has an account), '99…' = neighbour Gergana (phone only),
-- 'bb…' = a contact of Boris's person.
insert into public.trusted_contacts (id, protected_person_id, user_id, display_name, phone, priority) values
  ('cc000000-0000-0000-0000-000000000001', 'a1000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000003', 'Цвета', '+359888111222', 2),
  ('99000000-0000-0000-0000-000000000001', 'a1000000-0000-0000-0000-000000000001', null, 'Съседката Гергана', '+359888333444', 3),
  ('bb000000-0000-0000-0000-000000000001', 'b1000000-0000-0000-0000-000000000002', null, 'Съседът', '+359888999000', 2);

-- Anna's own row (id made by the trigger), kept in a temporary table so the
-- JSON lists below can refer to it.
create temporary table ids on commit drop as
select id as owner_row from public.trusted_contacts
where protected_person_id = 'a1000000-0000-0000-0000-000000000001'
  and user_id = 'a0000000-0000-0000-0000-000000000001';
grant select on ids to authenticated, anon;

-- =============================================================================
-- Owner A
-- =============================================================================
set local role authenticated;
set local request.jwt.claims = '{"sub": "a0000000-0000-0000-0000-000000000001", "role": "authenticated"}';

-- Swap Anna (1) and Cveta (2), rename Gergana, add Иван on place 4. The browser
-- also tries to give Иван Boris's account: the function ignores that field.
select lives_ok(
  format(
    $$ select public.replace_trusted_contacts('a1000000-0000-0000-0000-000000000001', %L::jsonb) $$,
    jsonb_build_array(
      jsonb_build_object('id', (select owner_row from ids), 'display_name', 'Анна', 'phone', '+359877000111', 'priority', 2),
      jsonb_build_object('id', 'cc000000-0000-0000-0000-000000000001', 'display_name', 'Цвета', 'phone', null, 'priority', 1),
      jsonb_build_object('id', '99000000-0000-0000-0000-000000000001', 'display_name', 'Гергана', 'phone', '+359888333444', 'priority', 3),
      jsonb_build_object('display_name', 'Иван', 'phone', '+359888555666', 'priority', 4,
                         'user_id', 'b0000000-0000-0000-0000-000000000002')
    )::text
  ),
  'owner can swap places, rename and add a contact in one call'
);

select results_eq(
  $$ select display_name, phone, priority::int, user_id from public.trusted_contacts
     where protected_person_id = 'a1000000-0000-0000-0000-000000000001' order by priority $$,
  $$ values ('Цвета', null::text, 1, 'c0000000-0000-0000-0000-000000000003'::uuid),
            ('Анна', '+359877000111', 2, 'a0000000-0000-0000-0000-000000000001'::uuid),
            ('Гергана', '+359888333444', 3, null::uuid),
            ('Иван', '+359888555666', 4, null::uuid) $$,
  'the new list is saved: places swapped, accounts kept, the new contact has no account'
);

select is(
  (select id from public.trusted_contacts where display_name = 'Цвета'),
  'cc000000-0000-0000-0000-000000000001'::uuid,
  'an existing contact keeps its id (it is updated, not deleted and re-added)'
);

-- Remove Гергана and Иван (not in the list any more); Cveta and Anna stay.
select lives_ok(
  format(
    $$ select public.replace_trusted_contacts('a1000000-0000-0000-0000-000000000001', %L::jsonb) $$,
    jsonb_build_array(
      jsonb_build_object('id', (select owner_row from ids), 'display_name', 'Анна', 'phone', null, 'priority', 1),
      jsonb_build_object('id', 'cc000000-0000-0000-0000-000000000001', 'display_name', 'Цвета', 'phone', null, 'priority', 2)
    )::text
  ),
  'owner can remove contacts'
);

select results_eq(
  $$ select display_name from public.trusted_contacts
     where protected_person_id = 'a1000000-0000-0000-0000-000000000001' order by priority $$,
  $$ values ('Анна'), ('Цвета') $$,
  'removed contacts are deleted'
);

-- Fill all 5 places, then move every contact one place down (5 -> 1): a full
-- cycle with no free place, possible only because it is ONE update statement.
select lives_ok(
  format(
    $$ select public.replace_trusted_contacts('a1000000-0000-0000-0000-000000000001', %L::jsonb) $$,
    jsonb_build_array(
      jsonb_build_object('id', (select owner_row from ids), 'display_name', 'Анна', 'phone', null, 'priority', 1),
      jsonb_build_object('id', 'cc000000-0000-0000-0000-000000000001', 'display_name', 'Цвета', 'phone', null, 'priority', 2),
      jsonb_build_object('display_name', 'Трети', 'phone', '+359888000003', 'priority', 3),
      jsonb_build_object('display_name', 'Четвърти', 'phone', '+359888000004', 'priority', 4),
      jsonb_build_object('display_name', 'Пети', 'phone', '+359888000005', 'priority', 5)
    )::text
  ),
  'owner can fill all 5 places'
);

select lives_ok(
  format(
    $$ select public.replace_trusted_contacts('a1000000-0000-0000-0000-000000000001', %L::jsonb) $$,
    (select jsonb_agg(jsonb_build_object(
              'id', tc.id, 'display_name', tc.display_name, 'phone', tc.phone,
              'priority', tc.priority % 5 + 1))
     from public.trusted_contacts as tc
     where tc.protected_person_id = 'a1000000-0000-0000-0000-000000000001')::text
  ),
  'a full rotation of all 5 places works (checked at the end of the statement)'
);

select results_eq(
  $$ select display_name from public.trusted_contacts
     where protected_person_id = 'a1000000-0000-0000-0000-000000000001' order by priority $$,
  $$ values ('Пети'), ('Анна'), ('Цвета'), ('Трети'), ('Четвърти') $$,
  'after the rotation every contact is one place lower'
);

select throws_ok(
  format(
    $$ select public.replace_trusted_contacts('a1000000-0000-0000-0000-000000000001', %L::jsonb) $$,
    jsonb_build_array(
      jsonb_build_object('id', 'cc000000-0000-0000-0000-000000000001', 'display_name', 'Цвета', 'phone', null, 'priority', 1)
    )::text
  ),
  '23514', null,
  'the owner''s own contact row can''t be removed'
);

select throws_ok(
  format(
    $$ select public.replace_trusted_contacts('a1000000-0000-0000-0000-000000000001', %L::jsonb) $$,
    jsonb_build_array(
      jsonb_build_object('id', (select owner_row from ids), 'display_name', 'Анна', 'phone', null, 'priority', 1),
      jsonb_build_object('id', 'bb000000-0000-0000-0000-000000000001', 'display_name', 'Откраднат', 'phone', null, 'priority', 2)
    )::text
  ),
  '22023', null,
  'a contact id of another person is refused'
);

select throws_ok(
  format(
    $$ select public.replace_trusted_contacts('a1000000-0000-0000-0000-000000000001', %L::jsonb) $$,
    jsonb_build_array(
      jsonb_build_object('id', (select owner_row from ids), 'display_name', 'Анна', 'phone', null, 'priority', 1),
      jsonb_build_object('id', 'cc000000-0000-0000-0000-000000000001', 'display_name', 'Цвета', 'phone', null, 'priority', 1)
    )::text
  ),
  '23505', null,
  'two contacts on the same place are refused (unique rule)'
);

select throws_ok(
  $$ select public.replace_trusted_contacts('b1000000-0000-0000-0000-000000000002', '[]'::jsonb) $$,
  '42501', null,
  'IDOR: owner A can''t change the contacts of B''s person'
);

-- =============================================================================
-- Cveta: a trusted contact of Баба Мария, but not the owner
-- =============================================================================
set local request.jwt.claims = '{"sub": "c0000000-0000-0000-0000-000000000003", "role": "authenticated"}';

select throws_ok(
  format(
    $$ select public.replace_trusted_contacts('a1000000-0000-0000-0000-000000000001', %L::jsonb) $$,
    jsonb_build_array(
      jsonb_build_object('id', (select owner_row from ids), 'display_name', 'Анна', 'phone', null, 'priority', 1)
    )::text
  ),
  '42501', null,
  'a trusted contact who is not the owner can''t change the list'
);

-- =============================================================================
-- Guest
-- =============================================================================
reset role;
set local role anon;
set local request.jwt.claims = '{"role": "anon"}';

select throws_ok(
  $$ select public.replace_trusted_contacts('a1000000-0000-0000-0000-000000000001', '[]'::jsonb) $$,
  '42501', null,
  'a guest can''t call the function at all'
);

-- =============================================================================
-- Superuser: nothing changed by the refused calls; function settings
-- =============================================================================
reset role;

select results_eq(
  $$ select display_name from public.trusted_contacts
     where protected_person_id = 'a1000000-0000-0000-0000-000000000001' order by priority $$,
  $$ values ('Пети'), ('Анна'), ('Цвета'), ('Трети'), ('Четвърти') $$,
  'refused calls changed nothing in Баба Мария''s list'
);

select results_eq(
  $$ select display_name from public.trusted_contacts
     where protected_person_id = 'b1000000-0000-0000-0000-000000000002' order by priority $$,
  $$ values ('Борис'), ('Съседът') $$,
  'Boris''s list is untouched'
);

select is(
  (select count(*)::int from public.trusted_contacts
   where protected_person_id = 'a1000000-0000-0000-0000-000000000001' and user_id is not null),
  2,
  'only Anna and Cveta have accounts: the function never set a user_id'
);

select is(
  (select p.prosecdef from pg_catalog.pg_proc p where p.proname = 'replace_trusted_contacts'),
  false,
  'the function is SECURITY INVOKER, so RLS and column privileges apply inside it'
);

select is(
  (select p.proconfig from pg_catalog.pg_proc p where p.proname = 'replace_trusted_contacts'),
  array['search_path=""'],
  'the function pins search_path'
);

select is(
  has_function_privilege('anon', 'public.replace_trusted_contacts(uuid, jsonb)', 'execute'),
  false,
  'anon has no execute right on the function'
);

select * from finish();
rollback;
