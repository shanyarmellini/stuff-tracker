-- Grant service_role full access to items.
-- BYPASSRLS only skips row-level policy checks; it does not grant the
-- underlying SQL table privileges that Postgres still enforces, so the
-- service-role client in src/lib/supabase/admin.ts (used by the admin
-- dashboard) needs an explicit grant to read item counts and totals.
grant select, insert, update, delete on public.items to service_role;
