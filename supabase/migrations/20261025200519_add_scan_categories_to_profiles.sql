-- The broad categories (ids from src/lib/categories/taxonomy.ts) a user
-- limits email scanning to, picked during onboarding. Emails and items
-- outside them are never sent to or recorded by the extraction AI. Empty
-- means no limit, so existing users keep today's behavior. Covered by the
-- existing table-level grants and row-level policies on profiles.
alter table public.profiles
  add column if not exists scan_categories text[] not null default '{}';
