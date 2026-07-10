-- Stores each user's Google OAuth connection (Gmail read access).
-- Tokens are sensitive and must only ever be read/written by the service role;
-- authenticated users may only see that they're connected (see the column
-- grants in the companion migration), never the tokens themselves.
create table if not exists public.google_connections (
  user_id           uuid primary key references auth.users (id) on delete cascade,
  refresh_token     text not null,
  access_token      text,
  token_expires_at  timestamptz,
  scope             text,
  email             text,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

-- user_id is the primary key, so it already has a covering index for the
-- RLS policy below; no separate index is needed.

alter table public.google_connections enable row level security;

-- Authenticated users may check their own connection status/email.
-- Column grants (see companion migration) prevent them from selecting the
-- token columns even though this policy matches the row.
create policy "users can select own connection"
  on public.google_connections for select
  to authenticated
  using ((select auth.uid()) = user_id);

-- No insert/update/delete policies for anon or authenticated: only the
-- service role (which bypasses RLS) is allowed to write to this table.
