-- Waitlist for prospective users while signups are gated to the owner account.
-- Anyone can add their email; nobody can read the list back through the API
-- (only the service-role admin client can, bypassing RLS).
create table if not exists public.waitlist (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null unique,
  created_at timestamptz not null default now()
);

alter table public.waitlist enable row level security;

create policy "anon_insert_waitlist"
on public.waitlist
for insert
to anon
with check (true);

create policy "authenticated_insert_waitlist"
on public.waitlist
for insert
to authenticated
with check (true);
