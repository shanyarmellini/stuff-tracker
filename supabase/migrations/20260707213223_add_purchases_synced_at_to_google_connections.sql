-- Watermark for incremental purchase-email scanning, so each sync only
-- looks at emails received since the last successful run. Only touched via
-- the service-role admin client, so no additional grants are needed.
alter table public.google_connections
  add column if not exists purchases_synced_at timestamptz;
