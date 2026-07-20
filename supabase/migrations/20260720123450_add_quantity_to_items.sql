-- Add quantity column so multiple identical items extracted from one email
-- (e.g. 3 Uber rides billed as separate line items) can be represented as a
-- single card with a count, instead of dropping the extras or showing
-- indistinguishable duplicate cards.
alter table public.items
  add column if not exists quantity integer not null default 1;

alter table public.items
  drop constraint if exists items_quantity_positive;
alter table public.items
  add constraint items_quantity_positive check (quantity > 0);
