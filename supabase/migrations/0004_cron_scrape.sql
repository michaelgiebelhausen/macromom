-- Schedule scrape-menus daily at ~5:30 AM ET (09:30 UTC) via pg_cron + pg_net
-- (TASK-027). NOTE: DST shifts UTC offset; 09:30 UTC = 5:30 EDT / 4:30 EST —
-- acceptable for a pre-breakfast job.
--
-- app.settings.supabase_url / service_role_key are provided by the platform in
-- hosted projects. For local dev, invoke the function manually (see
-- supabase/functions/scrape-menus/README.md).

CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

SELECT cron.schedule(
  'scrape-menus-daily',
  '30 9 * * *',
  $$
  SELECT net.http_post(
    url := current_setting('app.settings.supabase_url', true) || '/functions/v1/scrape-menus',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true)
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 300000
  );
  $$
);
