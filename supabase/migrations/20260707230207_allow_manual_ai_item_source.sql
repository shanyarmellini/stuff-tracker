-- Allow items created by AI extraction from a manually-pasted email, used
-- to test the purchase-scanning AI while Gmail OAuth is pending Google's
-- verification review (see gmail_ai for the eventual automatic path).
alter table public.items
  drop constraint if exists items_source_check;
alter table public.items
  add constraint items_source_check check (source in ('manual', 'gmail_ai', 'manual_ai'));
