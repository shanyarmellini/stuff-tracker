-- Create a public storage bucket for user-uploaded item photos.
-- Objects are stored under a `${user_id}/...` prefix so RLS can scope
-- writes/deletes to the owning user while allowing public reads (photos
-- are shown via plain <img> src URLs).

insert into storage.buckets (id, name, public)
values ('item-photos', 'item-photos', true)
on conflict (id) do nothing;

-- storage.objects already has RLS enabled by Supabase; only policies are added here.

-- Anyone can read item photos (bucket is public, used as <img> src)
create policy "public can select item photos"
  on storage.objects
  for select
  to public
  using (bucket_id = 'item-photos');

-- Users can only upload into their own user-id-prefixed folder
create policy "users can insert own item photos"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'item-photos'
    and (select auth.uid()::text) = (storage.foldername(name))[1]
  );

-- Users can only update their own item photos
create policy "users can update own item photos"
  on storage.objects
  for update
  to authenticated
  using (
    bucket_id = 'item-photos'
    and (select auth.uid()::text) = (storage.foldername(name))[1]
  )
  with check (
    bucket_id = 'item-photos'
    and (select auth.uid()::text) = (storage.foldername(name))[1]
  );

-- Users can only delete their own item photos
create policy "users can delete own item photos"
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'item-photos'
    and (select auth.uid()::text) = (storage.foldername(name))[1]
  );
