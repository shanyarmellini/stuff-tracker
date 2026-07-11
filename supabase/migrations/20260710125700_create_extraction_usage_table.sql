-- Logs one row per successful "extract items" AI call, used to derive
-- remaining quota (free: lifetime cap, pro: per-billing-period cap) by
-- counting rows rather than maintaining a mutable counter.
create table if not exists public.extraction_usage (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.extraction_usage enable row level security;

create index if not exists extraction_usage_user_id_created_at_idx
  on public.extraction_usage (user_id, created_at);

create policy "users can select own extraction usage"
  on public.extraction_usage for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "users can insert own extraction usage"
  on public.extraction_usage for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

grant select, insert on public.extraction_usage to authenticated;
grant select, insert, update, delete on public.extraction_usage to service_role;
