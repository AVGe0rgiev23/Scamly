-- Remove paired login accounts before removal of their device rows hides the IDs.
-- This also runs when an owner's auth deletion cascades to their protected people.
create function public.delete_paired_device_accounts()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  delete from auth.users
  using public.devices
  where auth.users.id = devices.user_id
    and devices.protected_person_id = old.id
    and exists (
      select 1 from public.profiles
      where profiles.id = devices.user_id and profiles.role = 'protected'
    );
  return old;
end;
$$;

revoke execute on function public.delete_paired_device_accounts() from public, anon, authenticated;

create trigger protected_person_delete_paired_accounts
before delete on public.protected_persons
for each row execute function public.delete_paired_device_accounts();
