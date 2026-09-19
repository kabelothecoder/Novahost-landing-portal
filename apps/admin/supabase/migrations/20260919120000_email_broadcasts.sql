-- A log of admin-sent broadcast emails (maintenance notices, launches, price
-- changes). The admin-broadcast edge function is the only writer -- it runs
-- on the service role, so RLS here is defense in depth, not the enforcement
-- point, matching payment_adjustments and affiliate_settings.
create table if not exists public.email_broadcasts (
  id uuid primary key default gen_random_uuid(),
  sent_by uuid references auth.users(id),
  audience text not null check (audience in ('app_users', 'mentors', 'everyone')),
  subject text not null,
  body text not null,
  recipient_count int not null default 0,
  sent_count int not null default 0,
  failed_count int not null default 0,
  created_at timestamptz not null default now()
);

alter table public.email_broadcasts enable row level security;

drop policy if exists "Admins manage broadcasts" on public.email_broadcasts;
create policy "Admins manage broadcasts" on public.email_broadcasts
  for all using (public.is_admin()) with check (public.is_admin());
