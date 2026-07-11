-- Tracks each user's Stripe subscription state. Written only by the Stripe
-- webhook handler via the service-role client; authenticated users may only
-- read their own row (to show plan/usage in the account UI).
create table if not exists public.subscriptions (
  user_id               uuid primary key references auth.users (id) on delete cascade,
  stripe_customer_id    text,
  stripe_subscription_id text,
  status                text,
  current_period_start  timestamptz,
  current_period_end    timestamptz,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

alter table public.subscriptions enable row level security;

create policy "users can select own subscription"
  on public.subscriptions for select
  to authenticated
  using ((select auth.uid()) = user_id);

-- No insert/update/delete policies for anon or authenticated: only the
-- service role (which bypasses RLS) may write to this table, from the
-- Stripe webhook handler.

grant select on public.subscriptions to authenticated;
grant select, insert, update, delete on public.subscriptions to service_role;
