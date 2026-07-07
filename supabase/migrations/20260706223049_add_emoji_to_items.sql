-- Add emoji column so users can pick an emoji as an alternative to a photo
alter table public.items
  add column if not exists emoji text;
