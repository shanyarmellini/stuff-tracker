-- Create items table for tracking user's stuff
create table if not exists public.items (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users (id) on delete cascade,
  name       text not null,
  price      numeric(10, 2) not null default 0,
  link       text,
  photo_url  text,
  created_at timestamptz not null default now()
);

alter table public.items enable row level security;

-- Index on user_id used in all RLS policies
create index if not exists items_user_id_idx on public.items (user_id);

-- Users can only read their own items
create policy "users can select own items"
  on public.items
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

-- Users can only insert their own items
create policy "users can insert own items"
  on public.items
  for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

-- Users can only update their own items
create policy "users can update own items"
  on public.items
  for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

-- Users can only delete their own items
create policy "users can delete own items"
  on public.items
  for delete
  to authenticated
  using ((select auth.uid()) = user_id);
