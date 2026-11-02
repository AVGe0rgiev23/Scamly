-- =============================================================================
-- Migration 4: privileges and Row Level Security policies (BUILD_PLAN 2.5)
--
-- Two locks, checked by PostgreSQL on every query from a browser:
--
--   1. PRIVILEGES (grant / revoke) decide WHICH COMMANDS a role may run on a
--      table at all (SELECT, INSERT, UPDATE...), and even which COLUMNS.
--   2. RLS POLICIES decide WHICH ROWS a role may see or change.
--
-- The roles (created by Supabase, not by us):
--   anon          = a guest, not logged in
--   authenticated = any logged-in user (family, device, moderator, admin;
--                   the policies tell them apart with the helper functions)
--   service_role  = our own server code; it BYPASSES RLS. Used only in the
--                   short list of server functions in BUILD_PLAN 2.4.
--
-- Supabase gives anon and authenticated ALL privileges on new tables by
-- default and relies on RLS alone. For defense in depth we first
-- "revoke all" on every table and then grant back only what the policy table
-- needs. This also blocks TRUNCATE, which RLS does not cover.
--
-- When RLS is enabled and there is no policy for a command, that command
-- returns / changes zero rows. So "no INSERT policy" = "nobody may insert"
-- (except service_role and the table owner).
--
-- Deliberately NO client INSERT/UPDATE policies on: checks, alerts, reports,
-- devices, pairing_codes, audit_log, rate_limits. Those writes go through
-- our API, which uses the service role after checking permissions in code.
--
-- Policy names describe what they allow, so a failing test is easy to read.
-- =============================================================================


-- -----------------------------------------------------------------------------
-- Step 1: switch on RLS on EVERY table.
-- -----------------------------------------------------------------------------
alter table public.districts          enable row level security;
alter table public.profiles           enable row level security;
alter table public.protected_persons  enable row level security;
alter table public.trusted_contacts   enable row level security;
alter table public.contact_invites    enable row level security;
alter table public.pairing_codes      enable row level security;
alter table public.devices            enable row level security;
alter table public.checks             enable row level security;
alter table public.alerts             enable row level security;
alter table public.push_subscriptions enable row level security;
alter table public.reports            enable row level security;
alter table public.scam_scripts       enable row level security;
alter table public.audit_log          enable row level security;
alter table public.rate_limits        enable row level security;


-- -----------------------------------------------------------------------------
-- Step 2: take away every privilege from guests and logged-in users.
-- The grants below give back exactly what each table needs.
-- -----------------------------------------------------------------------------
revoke all on table
  public.districts,
  public.profiles,
  public.protected_persons,
  public.trusted_contacts,
  public.contact_invites,
  public.pairing_codes,
  public.devices,
  public.checks,
  public.alerts,
  public.push_subscriptions,
  public.reports,
  public.scam_scripts,
  public.audit_log,
  public.rate_limits
from anon, authenticated;


-- =============================================================================
-- districts: public reference data. Everyone may read, nobody may write.
-- =============================================================================
grant select on public.districts to anon, authenticated;

create policy "Anyone can read districts"
  on public.districts for select
  to anon, authenticated
  using (true);


-- =============================================================================
-- profiles
--   * everyone logged in reads their own profile; admins read all profiles
--   * family / moderator / admin may update their own display_name and
--     email_alerts. The column privilege below makes it IMPOSSIBLE to update
--     any other column, so nobody can change their own role (that happens
--     only through the admin API with the service role, and is audited).
--   * a protected device can only read its profile (the older person never
--     edits settings).
--   * no INSERT / DELETE: the sign-up trigger creates profiles and they are
--     deleted together with the auth user.
-- =============================================================================
grant select on public.profiles to authenticated;
grant update (display_name, email_alerts) on public.profiles to authenticated;

create policy "Users can read their own profile"
  on public.profiles for select
  to authenticated
  using (id = auth.uid());

create policy "Admins can read all profiles"
  on public.profiles for select
  to authenticated
  using (public.is_admin());

create policy "Family, moderators and admins can update their own profile"
  on public.profiles for update
  to authenticated
  using (id = auth.uid() and public.app_role() in ('family', 'moderator', 'admin'))
  with check (id = auth.uid());


-- =============================================================================
-- protected_persons
--   * family: read people they own or are a trusted contact of; create a
--     person they own (only role 'family'); rename / change district / delete
--     only people they own
--   * device: read the person it is paired to
--   * admin: read all
--   * owner_id can't be changed (no column privilege), so a person can't be
--     "given away" to another account.
-- =============================================================================
grant select, delete on public.protected_persons to authenticated;
grant insert (owner_id, display_name, district_code) on public.protected_persons to authenticated;
grant update (display_name, district_code) on public.protected_persons to authenticated;

-- The owner check is written out directly (owner_id = auth.uid()) and not
-- only through has_family_access(id): when the owner creates a person with
-- INSERT ... RETURNING, the brand-new row must pass this SELECT policy, and a
-- STABLE helper function can't see a row inserted by the same statement yet.
create policy "Owners can read their protected persons"
  on public.protected_persons for select
  to authenticated
  using (owner_id = auth.uid());

create policy "Family can read protected persons they have access to"
  on public.protected_persons for select
  to authenticated
  using (public.has_family_access(id));

create policy "Devices can read their own protected person"
  on public.protected_persons for select
  to authenticated
  using (public.is_device_of(id));

create policy "Admins can read all protected persons"
  on public.protected_persons for select
  to authenticated
  using (public.is_admin());

create policy "Family can create protected persons they own"
  on public.protected_persons for insert
  to authenticated
  with check (owner_id = auth.uid() and public.app_role() = 'family');

create policy "Owners can update their protected persons"
  on public.protected_persons for update
  to authenticated
  using (public.is_owner_of(id))
  with check (owner_id = auth.uid());

create policy "Owners can delete their protected persons"
  on public.protected_persons for delete
  to authenticated
  using (public.is_owner_of(id));


-- =============================================================================
-- trusted_contacts
--   * family with access: read the contact list
--   * device: read the contact list (needed for the „Обади се на Иван“ button)
--   * owner: add, edit, remove contacts
--   * admin: read all
--   * user_id (which ACCOUNT the contact is) can't be set by the browser
--     (no column privilege): it is set only by the server when an invite is
--     redeemed, or by the owner trigger. Otherwise an owner could attach any
--     stranger's account to their person without that person agreeing.
-- =============================================================================
grant select, delete on public.trusted_contacts to authenticated;
grant insert (protected_person_id, display_name, phone, priority) on public.trusted_contacts to authenticated;
grant update (display_name, phone, priority) on public.trusted_contacts to authenticated;

create policy "Family can read contacts of persons they have access to"
  on public.trusted_contacts for select
  to authenticated
  using (public.has_family_access(protected_person_id));

create policy "Devices can read contacts of their protected person"
  on public.trusted_contacts for select
  to authenticated
  using (public.is_device_of(protected_person_id));

create policy "Admins can read all contacts"
  on public.trusted_contacts for select
  to authenticated
  using (public.is_admin());

create policy "Owners can add contacts"
  on public.trusted_contacts for insert
  to authenticated
  with check (public.is_owner_of(protected_person_id));

create policy "Owners can update contacts"
  on public.trusted_contacts for update
  to authenticated
  using (public.is_owner_of(protected_person_id))
  with check (public.is_owner_of(protected_person_id));

create policy "Owners can delete contacts"
  on public.trusted_contacts for delete
  to authenticated
  using (public.is_owner_of(protected_person_id));


-- =============================================================================
-- contact_invites: only the owner may see the invites of their person.
-- Creating and redeeming invites goes through the API.
-- =============================================================================
grant select on public.contact_invites to authenticated;

create policy "Owners can read invites of their protected persons"
  on public.contact_invites for select
  to authenticated
  using (public.is_owner_of(protected_person_id));


-- =============================================================================
-- pairing_codes: no access at all for browsers (no grants, no policies).
-- Only the server (service role) creates and redeems codes.
-- =============================================================================


-- =============================================================================
-- devices
--   * device: read its own row, only while it is not revoked
--   * family with access: read the devices of the person ("paired phones")
--   * admin: read all
--   * pairing and revoking go through the API (service role)
-- =============================================================================
grant select on public.devices to authenticated;

create policy "Devices can read their own non-revoked device row"
  on public.devices for select
  to authenticated
  using (user_id = auth.uid() and revoked_at is null);

create policy "Family can read devices of persons they have access to"
  on public.devices for select
  to authenticated
  using (public.has_family_access(protected_person_id));

create policy "Admins can read all devices"
  on public.devices for select
  to authenticated
  using (public.is_admin());


-- =============================================================================
-- checks (also sent live through Realtime, which applies these policies)
--   * device: read the checks of its protected person (e.g. "Иван ще ви се
--     обади веднага" after a family member acknowledges)
--   * family with access: read the checks of the person
--   * admin: read all (statistics)
--   * no client writes: the phone must not be able to send its own verdict
-- =============================================================================
grant select on public.checks to authenticated;

create policy "Devices can read checks of their protected person"
  on public.checks for select
  to authenticated
  using (public.is_device_of(protected_person_id));

create policy "Family can read checks of persons they have access to"
  on public.checks for select
  to authenticated
  using (public.has_family_access(protected_person_id));

create policy "Admins can read all checks"
  on public.checks for select
  to authenticated
  using (public.is_admin());


-- =============================================================================
-- alerts (also sent live through Realtime)
--   * every family member reads only the alerts addressed to them
--   * admin: read all
-- =============================================================================
grant select on public.alerts to authenticated;

create policy "Users can read alerts addressed to them"
  on public.alerts for select
  to authenticated
  using (recipient_id = auth.uid());

create policy "Admins can read all alerts"
  on public.alerts for select
  to authenticated
  using (public.is_admin());


-- =============================================================================
-- push_subscriptions: every logged-in user (any role) manages only their own
-- web-push subscriptions. No UPDATE: a changed subscription is deleted and
-- added again.
-- =============================================================================
grant select, insert, delete on public.push_subscriptions to authenticated;

create policy "Users can read their own push subscriptions"
  on public.push_subscriptions for select
  to authenticated
  using (user_id = auth.uid());

create policy "Users can add their own push subscriptions"
  on public.push_subscriptions for insert
  to authenticated
  with check (user_id = auth.uid());

create policy "Users can delete their own push subscriptions"
  on public.push_subscriptions for delete
  to authenticated
  using (user_id = auth.uid());


-- =============================================================================
-- reports
--   * guests: NO access to the table (not even SELECT); the map uses the
--     function get_map_stats() which returns only counts (migration 5).
--     Guests submit reports through the API, which rate-limits them.
--   * moderator (and admin): read all reports, and review them. The column
--     privilege allows changing ONLY the moderation columns (status,
--     reviewed_by, reviewed_at, reject_reason), not the report itself.
--     This also applies to admins: an admin can't rewrite a report either.
--   * admin: delete reports (e.g. spam)
-- =============================================================================
grant select, delete on public.reports to authenticated;
grant update (status, reviewed_by, reviewed_at, reject_reason) on public.reports to authenticated;

create policy "Moderators can read all reports"
  on public.reports for select
  to authenticated
  using (public.is_moderator());

create policy "Moderators can review reports"
  on public.reports for update
  to authenticated
  using (public.is_moderator())
  with check (public.is_moderator());

create policy "Admins can delete reports"
  on public.reports for delete
  to authenticated
  using (public.is_admin());


-- =============================================================================
-- scam_scripts (education cards)
--   * everyone, including guests: read PUBLISHED cards
--   * moderator (and admin): read all cards (also drafts), create, edit
--   * admin: also delete
-- =============================================================================
grant select on public.scam_scripts to anon;
grant select, insert, update, delete on public.scam_scripts to authenticated;

create policy "Anyone can read published scripts"
  on public.scam_scripts for select
  to anon, authenticated
  using (published);

create policy "Moderators can read all scripts"
  on public.scam_scripts for select
  to authenticated
  using (public.is_moderator());

create policy "Moderators can create scripts"
  on public.scam_scripts for insert
  to authenticated
  with check (public.is_moderator());

create policy "Moderators can update scripts"
  on public.scam_scripts for update
  to authenticated
  using (public.is_moderator())
  with check (public.is_moderator());

create policy "Admins can delete scripts"
  on public.scam_scripts for delete
  to authenticated
  using (public.is_admin());


-- =============================================================================
-- audit_log: APPEND-ONLY.
--   * admin: read
--   * only the server (service role) adds rows
--   * nobody updates or deletes rows: there are no UPDATE/DELETE policies,
--     and we also take UPDATE/DELETE/TRUNCATE away from the service role
--     (which would otherwise bypass RLS), so even a bug in our own server
--     code can't rewrite history.
-- =============================================================================
grant select on public.audit_log to authenticated;
revoke update, delete, truncate on public.audit_log from service_role;

create policy "Admins can read the audit log"
  on public.audit_log for select
  to authenticated
  using (public.is_admin());


-- =============================================================================
-- rate_limits: no access at all for browsers (no grants, no policies).
-- Used only through hit_rate_limit(), which only the service role may call.
-- =============================================================================
