-- Grant authenticated role column-scoped access to google_connections so
-- PostgREST can reach it, while keeping token columns off-limits.
-- refresh_token, access_token, and scope are intentionally excluded: only
-- the service role (which bypasses RLS and column grants) may read or
-- write them.
grant select (user_id, email, token_expires_at, created_at, updated_at)
  on public.google_connections to authenticated;
