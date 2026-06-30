-- User profile collected during onboarding
create table if not exists public.profiles (
  user_id             uuid primary key references auth.users (id) on delete cascade,
  item_types          text[]       not null default '{}',
  gender              text,
  age                 integer,
  onboarding_complete boolean      not null default false,
  created_at          timestamptz  not null default now()
);

alter table public.profiles enable row level security;

create policy "users can select own profile"
  on public.profiles for select to authenticated
  using ((select auth.uid()) = user_id);

create policy "users can insert own profile"
  on public.profiles for insert to authenticated
  with check ((select auth.uid()) = user_id);

create policy "users can update own profile"
  on public.profiles for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
