-- The previous items_link_format_check only required the final label to be
-- non-empty (fixing "amazon."), but still let through single-character
-- "TLDs" like "amazon.c" -- no real top-level domain is a single character.
-- isValidLink now requires the final label to be at least 2 characters; this
-- migration tightens the DB constraint to match.

-- Clear out any pre-existing links that satisfied the old constraint but fail
-- the stricter one (e.g. single-character TLDs).
update public.items
set link = null
where link is not null
  and btrim(link) <> ''
  and btrim(link) !~* '^(https?://)?([^./\s]+\.)+[^./\s]{2,}(/\S*)?$';

alter table public.items
  drop constraint if exists items_link_format_check;

alter table public.items
  add constraint items_link_format_check
  check (
    link is null
    or btrim(link) = ''
    or btrim(link) ~* '^(https?://)?([^./\s]+\.)+[^./\s]{2,}(/\S*)?$'
  );
