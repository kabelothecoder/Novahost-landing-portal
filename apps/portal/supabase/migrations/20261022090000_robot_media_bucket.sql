-- Robot loop videos.
--
-- A mentor uploads a short looping clip (<= 8 s, checked in the portal) that
-- the app plays as the robot's art on Classic, Focus Engine and Full-Bleed.
-- The public URL is saved to expert_advisors.background_video_url; the row
-- holds only the link, never the bytes (unlike avatar_url, which is a data URI
-- on most rows today).
--
-- Public read: the app plays the file straight from its public URL, and the
-- clip is the same marketing art the mentor already shows every buyer.
-- Writes: an APPROVED mentor, inside their own uid folder only. 10 MB cap and
-- MP4/MOV only, enforced here as well as in the portal, because MP4 (H.264) and
-- MOV are what every iPhone Safari plays; WebM is not.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('robot-media', 'robot-media', true, 10485760, array['video/mp4', 'video/quicktime'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "mentor uploads own robot media" on storage.objects;
create policy "mentor uploads own robot media" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'robot-media'
    and (storage.foldername(name))[1] = auth.uid()::text
    and exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.approval_status = 'approved'
    )
  );

drop policy if exists "mentor deletes own robot media" on storage.objects;
create policy "mentor deletes own robot media" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'robot-media'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
