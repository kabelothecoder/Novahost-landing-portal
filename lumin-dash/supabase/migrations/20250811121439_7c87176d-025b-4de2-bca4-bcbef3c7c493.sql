-- Profiles: add avatar_url for storing public avatar
alter table public.profiles
  add column if not exists avatar_url text;

-- Create public avatars bucket
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

-- Storage policies for avatars bucket
-- Public read
drop policy if exists "Public read avatars" on storage.objects;
create policy "Public read avatars"
  on storage.objects for select
  using (bucket_id = 'avatars');

-- Owners can upload to their own folder
drop policy if exists "Users can upload avatars" on storage.objects;
create policy "Users can upload avatars"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'avatars'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

-- Owners can update their own avatar
drop policy if exists "Users can update avatars" on storage.objects;
create policy "Users can update avatars"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'avatars' and auth.uid()::text = (storage.foldername(name))[1]
  );

-- Owners can delete their own avatar
drop policy if exists "Users can delete avatars" on storage.objects;
create policy "Users can delete avatars"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'avatars' and auth.uid()::text = (storage.foldername(name))[1]
  );