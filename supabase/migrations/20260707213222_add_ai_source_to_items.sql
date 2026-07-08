-- Track which items were created manually vs. detected by the Gmail AI
-- purchase scanner, and record the source Gmail message so a re-sync never
-- creates duplicate items.
alter table public.items
  add column if not exists source text not null default 'manual',
  add column if not exists gmail_message_id text;

alter table public.items
  drop constraint if exists items_source_check;
alter table public.items
  add constraint items_source_check check (source in ('manual', 'gmail_ai'));

-- Partial unique index: only AI-created items carry a gmail_message_id, so
-- this only constrains re-imports of the same email for the same user.
create unique index if not exists items_user_gmail_message_id_idx
  on public.items (user_id, gmail_message_id)
  where gmail_message_id is not null;
