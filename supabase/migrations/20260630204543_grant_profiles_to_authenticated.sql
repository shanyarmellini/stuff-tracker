-- Grant authenticated role access to profiles table so PostgREST can reach it
grant select, insert, update on public.profiles to authenticated;
