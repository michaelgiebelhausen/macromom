-- Daily push windows (TASK-039): ~7:30 AM / 11:00 AM / 4:30 PM ET.
-- UTC schedules assume EDT (UTC-4); acceptable drift under EST.

SELECT cron.schedule(
  'push-breakfast',
  '30 11 * * *',
  $$
  SELECT net.http_post(
    url := current_setting('app.settings.supabase_url', true) || '/functions/v1/send-daily-push?meal=breakfast',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true)
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 300000
  );
  $$
);

SELECT cron.schedule(
  'push-lunch',
  '0 15 * * *',
  $$
  SELECT net.http_post(
    url := current_setting('app.settings.supabase_url', true) || '/functions/v1/send-daily-push?meal=lunch',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true)
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 300000
  );
  $$
);

SELECT cron.schedule(
  'push-dinner',
  '30 20 * * *',
  $$
  SELECT net.http_post(
    url := current_setting('app.settings.supabase_url', true) || '/functions/v1/send-daily-push?meal=dinner',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true)
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 300000
  );
  $$
);
