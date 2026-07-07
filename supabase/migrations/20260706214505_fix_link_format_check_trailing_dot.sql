-- The previous items_link_format_check constraint only required *a* dot to
-- appear somewhere in the host (mirroring the old client-side isValidLink,
-- which just checked hostname.includes(".")). That let a bare trailing dot
-- like "amazon." through on both the client and the DB, since a URL host of
-- "amazon." still "includes" a dot despite having no actual TLD after it.
-- isValidLink now requires at least one non-empty label after every dot; this
-- migration tightens the DB constraint to match.

-- Clear out any pre-existing links that satisfied the old, looser constraint
-- but fail the stricter one (e.g. trailing-dot hosts).
update public.items
set link = null
where link is not null
  and btrim(link) <> ''
  and btrim(link) !~* '^(https?://)?[^./\s]+(\.[^./\s]+)+(/\S*)?$';

alter table public.items
  drop constraint if exists items_link_format_check;

alter table public.items
  add constraint items_link_format_check
  check (
    link is null
    or btrim(link) = ''
    or btrim(link) ~* '^(https?://)?[^./\s]+(\.[^./\s]+)+(/\S*)?$'
  );
