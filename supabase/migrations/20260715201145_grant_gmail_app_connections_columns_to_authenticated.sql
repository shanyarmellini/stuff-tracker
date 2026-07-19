-- Grant authenticated role column-scoped access to gmail_app_connections so
-- PostgREST can reach it, while keeping the app_password column off-limits.
-- app_password is intentionally excluded: only the service role (which
-- bypasses RLS and column grants) may read or write it.
grant select (user_id, email, created_at, updated_at)
  on public.gmail_app_connections to authenticated;
