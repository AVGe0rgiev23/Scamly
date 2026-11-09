-- =============================================================================
-- 12_scam_scripts_seed: the four starter education cards (migration
-- 20261109000001_seed_scam_scripts.sql, W3-05).
--   * exactly the 4 cards, all published, one per script type, with all texts
--   * a guest (the /kak-raboti pages, GET /api/scripts) sees all four
--   * a family member can read them but can't change, add or delete a card
--   * running the insert again changes nothing (on conflict do nothing)
-- =============================================================================
begin;
select plan(9);

-- --- As the superuser --------------------------------------------------------------
select results_eq(
  $$ select slug, script_type::text, published from public.scam_scripts order by slug $$,
  $$ values ('falshiv-sluzhitel', 'fake_official', true),
            ('kolet-kurier', 'courier', true),
            ('politsai', 'police', true),
            ('rodnina-v-beda', 'relative_in_trouble', true) $$,
  'the migration adds the 4 starter cards, all published'
);

select is(
  (select count(*)::int from public.scam_scripts
    where char_length(title_bg) between 1 and 80
      and char_length(how_it_starts_bg) between 1 and 1500
      and char_length(what_they_say_bg) between 1 and 1500
      and char_length(what_to_do_bg) between 1 and 1500),
  4,
  'every card has all texts within the API limits (title 80, texts 1500)'
);

select is(
  (select count(*)::int from public.scam_scripts where what_to_do_bg like '%112%'),
  4,
  'every card says to call 112 in danger'
);

-- Running the same insert again must not add or change anything.
insert into public.scam_scripts (slug, script_type, title_bg, how_it_starts_bg, what_they_say_bg, what_to_do_bg, published)
values ('politsai', 'police', 'Друго заглавие', 'x', 'x', 'x', false)
on conflict (slug) do nothing;

select is(
  (select title_bg || ' ' || published::text from public.scam_scripts where slug = 'politsai'),
  'Фалшив полицай true',
  'running the seed again keeps the existing card as it is'
);

-- --- Test user: a family member -------------------------------------------------------
delete from auth.users;   -- (rolled back at the end) cascades to profiles...
insert into auth.users (id, email) values ('a0000000-0000-0000-0000-000000000001', 'anna@example.com');

-- =============================================================================
-- Guest (anon)
-- =============================================================================
set local role anon;
set local request.jwt.claims = '{"role": "anon"}';

select is((select count(*)::int from public.scam_scripts), 4, 'a guest sees the 4 published cards');

-- =============================================================================
-- Family member
-- =============================================================================
reset role;
set local role authenticated;
set local request.jwt.claims = '{"sub": "a0000000-0000-0000-0000-000000000001", "role": "authenticated"}';

select is((select count(*)::int from public.scam_scripts), 4, 'a family member can read the 4 cards');

-- RLS hides the rows from UPDATE and DELETE for a family member: 0 rows change.
update public.scam_scripts set title_bg = 'Хакнато' where slug = 'politsai';
delete from public.scam_scripts where slug = 'kolet-kurier';

select throws_ok(
  $$ insert into public.scam_scripts (slug, script_type, title_bg, how_it_starts_bg, what_they_say_bg, what_to_do_bg)
     values ('spam', 'police', 'x', 'x', 'x', 'x') $$,
  '42501', null,
  'a family member can''t add a card'
);

reset role;
select is(
  (select title_bg from public.scam_scripts where slug = 'politsai'),
  'Фалшив полицай',
  'a family member can''t change a card'
);
select is((select count(*)::int from public.scam_scripts), 4, 'a family member can''t delete a card');

select * from finish();
rollback;
