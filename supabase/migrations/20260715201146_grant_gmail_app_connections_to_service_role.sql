-- Grant service_role full access to gmail_app_connections.
-- BYPASSRLS only skips row-level policy checks; it does not grant the
-- underlying SQL table privileges that Postgres still enforces, so the
-- service-role client in src/lib/supabase/admin.ts needs an explicit grant
-- to read/write the app password.
grant select, insert, update, delete on public.gmail_app_connections to service_role;
