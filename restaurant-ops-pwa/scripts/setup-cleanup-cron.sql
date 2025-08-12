-- Setup cron job for cleaning up orphaned photos
-- This will run the cleanup Edge Function daily at 3 AM
-- Created: 2025-08-12

-- First, ensure pg_cron extension is enabled
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Create a cron job to clean up orphaned photos daily at 3 AM
SELECT cron.schedule(
  'cleanup-orphaned-photos', -- job name
  '0 3 * * *', -- cron expression (3 AM daily)
  $$
  SELECT net.http_post(
    url := 'https://wdpeoyugsxqnpwwtkqsl.supabase.co/functions/v1/cleanup-orphaned-photos',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true),
      'Content-Type', 'application/json'
    ),
    body := jsonb_build_object('trigger', 'cron')
  );
  $$
);

-- To view all scheduled jobs
-- SELECT * FROM cron.job;

-- To remove the job (if needed)
-- SELECT cron.unschedule('cleanup-orphaned-photos');

-- Note: The pg_cron extension needs to be enabled by Supabase support for production projects
-- For development, you can manually trigger the function using:
-- curl -X POST https://wdpeoyugsxqnpwwtkqsl.supabase.co/functions/v1/cleanup-orphaned-photos \
--   -H "Authorization: Bearer YOUR_ANON_KEY" \
--   -H "Content-Type: application/json"