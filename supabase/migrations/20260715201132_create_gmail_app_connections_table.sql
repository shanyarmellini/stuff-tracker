-- Stores each user's Gmail App Password connection.
-- This is a stand-in for the OAuth flow (see google_connections) while the
-- Google OAuth app is pending verification: users generate a 16-character
-- app password in their Google Account and paste it in during onboarding.
-- Like tokens, app passwords are sensitive and must only ever be
-- read/written by the service role; authenticated users may only see that
-- they're connected (see the column grants in the companion migration),
-- never the password itself.
create table if not exists public.gmail_app_connections (
  user_id       uuid primary key references auth.users (id) on delete cascade,
  email         text not null,
  app_password  text not null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- user_id is the primary key, so it already has a covering index for the
-- RLS policy below; no separate index is needed.

alter table public.gmail_app_connections enable row level security;

-- Authenticated users may check their own connection status/email.
-- Column grants (see companion migration) prevent them from selecting the
-- app_password column even though this policy matches the row.
create policy "users can select own gmail app connection"
  on public.gmail_app_connections for select
  to authenticated
  using ((select auth.uid()) = user_id);

-- No insert/update/delete policies for anon or authenticated: only the
-- service role (which bypasses RLS) is allowed to write to this table.
