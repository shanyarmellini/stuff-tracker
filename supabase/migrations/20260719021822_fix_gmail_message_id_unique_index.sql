-- The partial unique index added in 20260707213222_add_ai_source_to_items.sql
-- (`where gmail_message_id is not null`) can never be targeted by an
-- upsert()'s plain `ON CONFLICT (user_id, gmail_message_id)` clause -
-- Postgres requires the same WHERE predicate on the ON CONFLICT clause to
-- match a partial index, which PostgREST's upsert never sends. Every AI item
-- insert has been failing with "no unique or exclusion constraint matching
-- the ON CONFLICT specification". Replace it with a full unique index -
-- NULLs are still never considered equal in a unique index, so manual items
-- (which have no gmail_message_id) are unaffected.
drop index if exists public.items_user_gmail_message_id_idx;

create unique index if not exists items_user_gmail_message_id_idx
  on public.items (user_id, gmail_message_id);
