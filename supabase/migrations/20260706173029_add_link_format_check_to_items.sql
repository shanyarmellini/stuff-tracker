-- Enforce that items.link, when present, is a well-formed URL/domain.
-- App-layer validation (isValidLink in dashboard/page.tsx) already blocks
-- invalid links in the UI, but this constraint guarantees it at the
-- database level regardless of client code path (direct API calls, future
-- forms that skip client validation, etc). Mirrors isValidLink's own rule:
-- no whitespace, and a dot somewhere in the host before any path.

-- Clear out any pre-existing invalid links so the constraint below can be added.
update public.items
set link = null
where link is not null
  and btrim(link) <> ''
  and btrim(link) !~* '^(https?://)?[^/\s]*\.[^/\s]*(/\S*)?$';

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'items_link_format_check'
  ) then
    alter table public.items
      add constraint items_link_format_check
      check (
        link is null
        or btrim(link) = ''
        or btrim(link) ~* '^(https?://)?[^/\s]*\.[^/\s]*(/\S*)?$'
      );
  end if;
end $$;
