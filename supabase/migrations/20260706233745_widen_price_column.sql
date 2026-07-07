-- Widen price column from numeric(10,2) to numeric(12,2) to prevent overflow
-- when users enter prices with up to 10 digits (client-side validation allows 10 digits)
alter table items
  alter column price type numeric(12, 2);
