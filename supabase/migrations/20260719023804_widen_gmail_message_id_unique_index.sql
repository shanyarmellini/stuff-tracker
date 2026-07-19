-- The unique index on (user_id, gmail_message_id) alone (from
-- 20260719021822) silently dropped items whenever a purchase confirmation
-- email contained more than one product (e.g. a multi-item order) - every
-- item from that email shares the same gmail_message_id, so only the first
-- one survived the upsert's ON CONFLICT DO NOTHING.
--
-- Widen the index to (user_id, gmail_message_id, name, price) so only
-- genuinely identical items from the same email collide (which the AI
-- extraction step already collapses upstream via its own in-memory dedup),
-- while distinct products from the same email can all be stored.
drop index if exists public.items_user_gmail_message_id_idx;

create unique index if not exists items_user_gmail_message_id_idx
  on public.items (user_id, gmail_message_id, name, price);
