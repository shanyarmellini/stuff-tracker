-- Add sort_order to items to support manual drag-and-drop reordering
alter table public.items
  add column if not exists sort_order integer;

-- Backfill existing rows so the initial order matches the previous default (newest first)
with ordered as (
  select id, row_number() over (partition by user_id order by created_at desc) as rn
  from public.items
)
update public.items
set sort_order = ordered.rn
from ordered
where public.items.id = ordered.id;

alter table public.items
  alter column sort_order set not null,
  alter column sort_order set default 0;
