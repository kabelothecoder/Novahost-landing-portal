-- Admin-assigned key quotas and the mentor-side request flow that asks for
-- more. profiles.license_credits already exists but is a decrementing
-- counter nobody ever set (zero on all 27 rows) -- a decrementing counter
-- drifts against reality, where `quota - count(licenses)` cannot, so this
-- adds a fresh column rather than reviving that one.

alter table public.profiles
  add column if not exists license_quota int;

alter table public.profiles
  drop constraint if exists profiles_license_quota_check;
alter table public.profiles
  add constraint profiles_license_quota_check check (license_quota is null or license_quota >= 0);

comment on column public.profiles.license_quota is
  'Max licence keys this mentor may hold at once. Null = unlimited. Compared against count(licenses) at generate time, never decremented, so it cannot drift.';

-- Backfill every existing profile so nobody currently over a sensible
-- default gets locked out the moment this ships. The two busiest mentors
-- already hold 43 keys each, so a flat 50 would immediately block them;
-- greatest(50, current + 25) gives everyone the same 50-key floor while
-- leaving headroom above whatever they already have.
update public.profiles p
set license_quota = greatest(50, coalesce((
  select count(*) from public.licenses l where l.user_id = p.id
), 0) + 25)
where license_quota is null;

alter table public.profiles
  alter column license_quota set default 50;

-- The request a mentor files when the quota above is not enough.
create table if not exists public.license_key_requests (
  id uuid primary key default gen_random_uuid(),
  mentor_id uuid not null references auth.users(id) on delete cascade,
  requested int not null check (requested > 0),
  reason text,
  status text not null default 'pending' check (status in ('pending', 'approved', 'declined')),
  granted int,
  decided_at timestamptz,
  decided_by uuid references auth.users(id),
  decision_note text,
  created_at timestamptz not null default now()
);

create index if not exists license_key_requests_mentor_status_idx
  on public.license_key_requests (mentor_id, status);

alter table public.license_key_requests enable row level security;

drop policy if exists "Mentors view their own key requests" on public.license_key_requests;
create policy "Mentors view their own key requests" on public.license_key_requests
  for select using (auth.uid() = mentor_id);

drop policy if exists "Mentors file their own key requests" on public.license_key_requests;
create policy "Mentors file their own key requests" on public.license_key_requests
  for insert with check (auth.uid() = mentor_id);

-- Deciding a request (approve/decline) is an admin action only, done through
-- admin-approve-mentor on the service role -- no client-side update path.
drop policy if exists "Admins manage key requests" on public.license_key_requests;
create policy "Admins manage key requests" on public.license_key_requests
  for all using (public.is_admin()) with check (public.is_admin());
