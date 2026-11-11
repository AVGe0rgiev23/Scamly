-- Run in Supabase SQL Editor after deploying the migration and the API route.
-- Enable pg_cron and pg_net in Supabase first. In Vault, add scamly_site_url
-- (the HTTPS origin) and scamly_cron_secret (the same value as Vercel's CRON_SECRET).
-- Set FEATURE_ESCALATION=true only once the job and its credentials are ready.
select cron.schedule(
  'scamly-alert-escalation',
  '* * * * *',
  $job$
  select net.http_post(
    url := rtrim(site.decrypted_secret, '/') || '/api/cron/escalate',
    headers := jsonb_build_object('Authorization', 'Bearer ' || secret.decrypted_secret),
    timeout_milliseconds := 15000
  )
  from vault.decrypted_secrets site
  cross join vault.decrypted_secrets secret
  where site.name = 'scamly_site_url'
    and secret.name = 'scamly_cron_secret';
  $job$
);
