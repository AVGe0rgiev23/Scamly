-- =============================================================================
-- Migration 1: schema
--
-- Creates every enum and table of Scamly, with foreign keys, CHECK
-- constraints, unique constraints and indexes, and seeds the 28 districts.
-- Spec: docs/BUILD_PLAN.md section 2 (2.1 ER diagram, 2.2 enums, 2.3 notes).
--
-- Rules we follow in this file:
--   * Every table has a short comment above it explaining what it is for.
--   * "on delete cascade" is used when a child row makes no sense without its
--     parent (e.g. a check without its protected person).
--   * "on delete set null" is used when the child should survive
--     (e.g. a report stays when the moderator who reviewed it is deleted).
--   * Row Level Security is NOT switched on here; that happens in migration 4
--     together with the policies, so the security rules are all in one place.
--
-- gen_random_uuid() is built into PostgreSQL 13+, so no extension is needed.
-- =============================================================================


-- -----------------------------------------------------------------------------
-- Enums (BUILD_PLAN 2.2). An enum is a fixed list of allowed values, so the
-- database itself rejects a typo like 'polise'.
-- -----------------------------------------------------------------------------

-- Role of a logged-in user. A guest is simply "not logged in", so it is not here.
create type public.app_role as enum ('family', 'protected', 'moderator', 'admin');

-- "Who do they say they are?" (official = bank, electricity, НЗОК, НАП, НОИ...)
create type public.claimed_identity as enum ('police', 'relative', 'official', 'courier', 'other');

-- Answer to a yes/no question where the older person may not be sure.
create type public.tri as enum ('yes', 'no', 'unsure');

-- How the caller wants to receive the money.
create type public.handover_method as enum ('courier_or_stranger', 'throw', 'bank_transfer', 'other');

-- Result of the detection engine.
create type public.risk_level as enum ('green', 'yellow', 'red');

-- Known scam scripts used in Bulgaria.
create type public.script_type as enum ('police', 'relative_in_trouble', 'fake_official', 'courier', 'unknown');

-- A check is 'started' when the big button is pressed and 'answered' once the
-- questions are answered and the verdict is stored.
create type public.check_status as enum ('started', 'answered');

-- How an alert is delivered to a family member.
create type public.alert_channel as enum ('realtime', 'push', 'email');

-- Delivery status of an alert.
create type public.alert_status as enum ('pending', 'sent', 'failed');

-- Moderation status of a public report.
create type public.report_status as enum ('pending', 'approved', 'rejected');


-- -----------------------------------------------------------------------------
-- districts: the 28 Bulgarian districts (области), ISO 3166-2:BG codes.
-- Used for protected persons and for the public map. Seeded at the end.
-- -----------------------------------------------------------------------------
create table public.districts (
  code    text primary key check (code ~ '^BG-[0-9]{2}$'),
  name_bg text not null unique
);


-- -----------------------------------------------------------------------------
-- profiles: one row per auth user (1:1 with auth.users), holds the app role.
-- Created automatically by a trigger on sign-up (migration 2), never by the
-- browser. Users may change only display_name and email_alerts (migration 4).
-- -----------------------------------------------------------------------------
create table public.profiles (
  id           uuid primary key references auth.users (id) on delete cascade,
  role         public.app_role not null default 'family',
  display_name text not null check (char_length(display_name) between 1 and 60),
  email_alerts boolean not null default true,
  created_at   timestamptz not null default now()
);


-- -----------------------------------------------------------------------------
-- protected_persons: an older person whom a family member protects.
-- The family member who created it is the owner. Deleting the owner's account
-- deletes their protected persons and all their data (GDPR).
-- -----------------------------------------------------------------------------
create table public.protected_persons (
  id            uuid primary key default gen_random_uuid(),
  owner_id      uuid not null references public.profiles (id) on delete cascade,
  display_name  text not null check (char_length(display_name) between 1 and 60),
  district_code text not null references public.districts (code),
  created_at    timestamptz not null default now()
);

create index protected_persons_owner_id_idx on public.protected_persons (owner_id);


-- -----------------------------------------------------------------------------
-- trusted_contacts: the ordered list of people to call / alert for one
-- protected person (priority 1 = called first). The owner is added as
-- priority 1 automatically (trigger in migration 2).
-- user_id is set only when the contact has a Scamly account (via an invite);
-- a contact without an account still appears in the "call" list by phone.
-- If that account is deleted, the contact stays as a phone-only contact.
-- -----------------------------------------------------------------------------
create table public.trusted_contacts (
  id                  uuid primary key default gen_random_uuid(),
  protected_person_id uuid not null references public.protected_persons (id) on delete cascade,
  user_id             uuid references public.profiles (id) on delete set null,
  display_name        text not null check (char_length(display_name) between 1 and 60),
  phone               text check (char_length(phone) between 3 and 30),
  priority            smallint not null check (priority between 1 and 5),
  created_at          timestamptz not null default now(),

  -- Two contacts of the same person can't have the same position in the list.
  -- DEFERRABLE: the check runs at the end of the statement, so one UPDATE can
  -- swap two priorities (1 <-> 2) without a temporary clash.
  constraint trusted_contacts_person_priority_key
    unique (protected_person_id, priority) deferrable initially immediate,

  -- The same account can't be a contact of the same person twice.
  -- (Rows with user_id = null don't clash: NULLs are never equal.)
  constraint trusted_contacts_person_user_key
    unique (protected_person_id, user_id)
);

create index trusted_contacts_user_id_idx on public.trusted_contacts (user_id);


-- -----------------------------------------------------------------------------
-- contact_invites: a single-use invite for another relative to become a
-- trusted contact. We store only an HMAC of the token, never the token itself.
-- -----------------------------------------------------------------------------
create table public.contact_invites (
  id                  uuid primary key default gen_random_uuid(),
  protected_person_id uuid not null references public.protected_persons (id) on delete cascade,
  display_name        text not null check (char_length(display_name) between 1 and 60),
  priority            smallint not null check (priority between 1 and 5),
  token_hash          text not null unique,
  created_at          timestamptz not null default now(),
  expires_at          timestamptz not null,
  used_at             timestamptz
);

create index contact_invites_person_idx on public.contact_invites (protected_person_id);


-- -----------------------------------------------------------------------------
-- pairing_codes: 6-digit codes that pair an older person's phone (section 5).
-- We store HMAC-SHA256(code, PAIRING_PEPPER), not the code. Valid 10 minutes,
-- single use. Only the server (service role) ever reads or writes this table.
-- -----------------------------------------------------------------------------
create table public.pairing_codes (
  id                  uuid primary key default gen_random_uuid(),
  protected_person_id uuid not null references public.protected_persons (id) on delete cascade,
  code_hash           text not null,
  created_by          uuid not null references public.profiles (id) on delete cascade,
  created_at          timestamptz not null default now(),
  expires_at          timestamptz not null,
  used_at             timestamptz
);

-- Among the codes that are still unused, a hash may appear only once, so
-- "find the code with this hash" always finds at most one row.
create unique index pairing_codes_unused_code_hash_key
  on public.pairing_codes (code_hash)
  where used_at is null;

create index pairing_codes_person_idx on public.pairing_codes (protected_person_id);


-- -----------------------------------------------------------------------------
-- devices: phones paired to a protected person. Each device has its own auth
-- user (created by the server after a correct pairing code). Revoking a device
-- deletes that auth user, and this row disappears with it (cascade).
-- revoked_at is an extra safety net: a revoked device sees nothing (RLS).
-- -----------------------------------------------------------------------------
create table public.devices (
  id                  uuid primary key default gen_random_uuid(),
  protected_person_id uuid not null references public.protected_persons (id) on delete cascade,
  user_id             uuid not null unique references auth.users (id) on delete cascade,
  label               text check (char_length(label) between 1 and 60),
  paired_at           timestamptz not null default now(),
  last_seen_at        timestamptz,
  revoked_at          timestamptz
);

-- (The unique constraint on user_id already creates the devices(user_id) index.)
create index devices_protected_person_id_idx on public.devices (protected_person_id);


-- -----------------------------------------------------------------------------
-- checks: one "someone is calling me for money" check by an older person.
-- Created when the big button is pressed (status 'started'), then filled with
-- the answers and the verdict that the SERVER computed (status 'answered').
-- text_redacted has personal data removed BEFORE it is saved.
-- -----------------------------------------------------------------------------
create table public.checks (
  id                  uuid primary key default gen_random_uuid(),
  protected_person_id uuid not null references public.protected_persons (id) on delete cascade,
  -- The history must survive when a phone is unpaired, so set null.
  device_id           uuid references public.devices (id) on delete set null,
  status              public.check_status not null default 'started',

  -- The answers of the older person (null until answered).
  claimed_identity    public.claimed_identity,
  asks_money          public.tri,
  handover            public.handover_method,
  rushing             public.tri,
  secrecy             public.tri,
  text_redacted       text check (char_length(text_redacted) <= 2000),
  caller_number_hash  text,

  -- The verdict of the detection engine (null until answered).
  score               smallint check (score between 0 and 100),
  risk_level          public.risk_level,
  script_type         public.script_type,
  hard_rules          text[] not null default '{}',
  reason_codes        text[] not null default '{}',
  engine_version      text,
  ai_provider         text,
  ai_level            public.risk_level,

  -- "Обаждам ѝ се сега": which family member answered the alert, and when.
  acknowledged_by     uuid references public.profiles (id) on delete set null,
  acknowledged_at     timestamptz,

  started_at          timestamptz not null default now(),
  answered_at         timestamptz,

  -- An answered check must have a verdict.
  constraint checks_answered_has_verdict
    check (status = 'started' or (score is not null and risk_level is not null)),
  -- A check can't be answered before it started.
  constraint checks_answered_after_started
    check (answered_at is null or answered_at >= started_at)
);

create index checks_person_started_idx on public.checks (protected_person_id, started_at desc);


-- -----------------------------------------------------------------------------
-- alerts: one row per (check, family member, channel). The server creates
-- them ("fan-out") when a check starts and records whether delivery worked.
-- escalation_step is used later by the escalation chain (D8).
-- -----------------------------------------------------------------------------
create table public.alerts (
  id              uuid primary key default gen_random_uuid(),
  check_id        uuid not null references public.checks (id) on delete cascade,
  recipient_id    uuid not null references public.profiles (id) on delete cascade,
  channel         public.alert_channel not null,
  status          public.alert_status not null default 'pending',
  escalation_step smallint not null default 0 check (escalation_step >= 0),
  error           text check (char_length(error) <= 500),
  created_at      timestamptz not null default now(),
  sent_at         timestamptz
);

create index alerts_recipient_created_idx on public.alerts (recipient_id, created_at desc);
create index alerts_check_id_idx on public.alerts (check_id);


-- -----------------------------------------------------------------------------
-- push_subscriptions: web-push endpoints of a user's browsers / phones.
-- -----------------------------------------------------------------------------
create table public.push_subscriptions (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles (id) on delete cascade,
  endpoint   text not null unique check (char_length(endpoint) <= 1000),
  p256dh     text not null,
  auth       text not null,
  created_at timestamptz not null default now()
);

-- Not in the BUILD_PLAN list, but every RLS check filters on user_id.
create index push_subscriptions_user_id_idx on public.push_subscriptions (user_id);


-- -----------------------------------------------------------------------------
-- reports: anonymous public reports of scam calls, for the map.
-- No personal data about the reporter, no address (only the district), no IP.
-- A moderator approves or rejects each report before it counts on the map.
-- -----------------------------------------------------------------------------
create table public.reports (
  id                   uuid primary key default gen_random_uuid(),
  district_code        text not null references public.districts (code),
  script_type          public.script_type not null,
  occurred_on          date not null,
  description_redacted text check (char_length(description_redacted) <= 1000),
  caller_number_hash   text,
  status               public.report_status not null default 'pending',
  reject_reason        text check (char_length(reject_reason) <= 500),
  submitted_at         timestamptz not null default now(),
  reviewed_by          uuid references public.profiles (id) on delete set null,
  reviewed_at          timestamptz
);

-- The moderation queue: "pending reports, oldest first".
create index reports_status_submitted_idx on public.reports (status, submitted_at);
-- The map: only approved reports, per district and date.
create index reports_approved_district_date_idx
  on public.reports (district_code, occurred_on)
  where status = 'approved';


-- -----------------------------------------------------------------------------
-- scam_scripts: the education cards („Как работи измамата“), one per script.
-- extra_keywords are stems a moderator adds for the detection engine.
-- Only published cards are visible to the public.
-- -----------------------------------------------------------------------------
create table public.scam_scripts (
  id               uuid primary key default gen_random_uuid(),
  slug             text not null unique check (slug ~ '^[a-z0-9-]{1,60}$'),
  script_type      public.script_type not null,
  title_bg         text not null check (char_length(title_bg) between 1 and 120),
  how_it_starts_bg text not null check (char_length(how_it_starts_bg) <= 2000),
  what_they_say_bg text not null check (char_length(what_they_say_bg) <= 2000),
  what_to_do_bg    text not null check (char_length(what_to_do_bg) <= 2000),
  extra_keywords   text[] not null default '{}',
  published        boolean not null default false,
  updated_by       uuid references public.profiles (id) on delete set null,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);


-- -----------------------------------------------------------------------------
-- audit_log: append-only log of important actions (role changes, approvals,
-- pairing, revoking devices...). Written only by the server. Nobody may
-- change or delete a row (see migration 4). If the actor's account is deleted
-- we keep the log line and only forget who it was (set null).
-- -----------------------------------------------------------------------------
create table public.audit_log (
  id          bigint generated always as identity primary key,
  actor_id    uuid references public.profiles (id) on delete set null,
  action      text not null check (char_length(action) between 1 and 100),
  target_type text,
  target_id   text,
  details     jsonb not null default '{}',
  created_at  timestamptz not null default now()
);

create index audit_log_created_at_idx on public.audit_log (created_at desc);


-- -----------------------------------------------------------------------------
-- rate_limits: counters for the rate limiter (fixed time windows).
-- key is e.g. 'pair:ip:<HMAC of IP>'. Used only by hit_rate_limit()
-- (migration 5). Old windows are deleted, so an IP hash is kept ~1 hour max.
-- -----------------------------------------------------------------------------
create table public.rate_limits (
  key          text not null,
  window_start timestamptz not null,
  hits         integer not null default 0 check (hits >= 0),
  primary key (key, window_start)
);

-- Lets the clean-up "delete old windows" find them without reading every row.
create index rate_limits_window_start_idx on public.rate_limits (window_start);


-- -----------------------------------------------------------------------------
-- Seed: the 28 districts of Bulgaria (ISO 3166-2:BG).
-- -----------------------------------------------------------------------------
insert into public.districts (code, name_bg) values
  ('BG-01', 'Благоевград'),
  ('BG-02', 'Бургас'),
  ('BG-03', 'Варна'),
  ('BG-04', 'Велико Търново'),
  ('BG-05', 'Видин'),
  ('BG-06', 'Враца'),
  ('BG-07', 'Габрово'),
  ('BG-08', 'Добрич'),
  ('BG-09', 'Кърджали'),
  ('BG-10', 'Кюстендил'),
  ('BG-11', 'Ловеч'),
  ('BG-12', 'Монтана'),
  ('BG-13', 'Пазарджик'),
  ('BG-14', 'Перник'),
  ('BG-15', 'Плевен'),
  ('BG-16', 'Пловдив'),
  ('BG-17', 'Разград'),
  ('BG-18', 'Русе'),
  ('BG-19', 'Силистра'),
  ('BG-20', 'Сливен'),
  ('BG-21', 'Смолян'),
  ('BG-22', 'София (столица)'),
  ('BG-23', 'София (област)'),
  ('BG-24', 'Стара Загора'),
  ('BG-25', 'Търговище'),
  ('BG-26', 'Хасково'),
  ('BG-27', 'Шумен'),
  ('BG-28', 'Ямбол');
