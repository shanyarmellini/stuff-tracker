-- Add category column to items for sidebar filtering
alter table public.items
  add column if not exists category text;

create index if not exists items_category_idx on public.items (category);
