-- Grant authenticated role access to items table so PostgREST can reach it
grant select, insert, update, delete on public.items to authenticated;
