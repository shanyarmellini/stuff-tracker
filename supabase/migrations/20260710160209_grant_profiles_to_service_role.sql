-- Grant service_role access to profiles.
-- BYPASSRLS only skips row-level policy checks; it does not grant the
-- underlying SQL table privileges that Postgres still enforces, so the
-- service-role client in src/lib/supabase/admin.ts needs an explicit grant
-- to read/write profiles (e.g. when seeding/upserting Stripe subscription
-- data). Profiles are never deleted outside of user-initiated flows, so
-- delete is intentionally omitted here.
grant select, insert, update on public.profiles to service_role;
