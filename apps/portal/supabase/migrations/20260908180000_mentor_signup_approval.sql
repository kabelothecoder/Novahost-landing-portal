-- Every new mentor signup lands in `pending` and cannot use the portal until an
-- administrator approves it. Email verification still happens first and is a
-- separate gate: verifying proves the address is real, approval decides whether
-- that person gets a mentor account at all.
--
-- Enforcement is in three places, because the portal UI is the weakest of them:
--   * this column + the trigger below (nobody can approve themselves),
--   * `is_approved()`, called by the mentor-facing edge functions,
--   * the portal's ProtectedRoute, which is only the visible half.

alter table public.profiles
  add column if not exists approval_status text,
  add column if not exists approved_at     timestamptz,
  add column if not exists approved_by     uuid references auth.users(id) on delete set null,
  add column if not exists approval_note   text;

-- Everyone who already had an account keeps it. They are deliberately *not*
-- recorded as approved-by-an-admin -- `approved_by` and `approved_at` stay null
-- so the audit trail never claims an approval that never happened.
--
-- This also has to happen before the default lands: the only `admin_users` row
-- is one of these accounts, and had it flipped to `pending` there would be
-- nobody left with the standing to approve anyone.
update public.profiles
   set approval_status = 'approved',
       approval_note   = 'Existing account, grandfathered when approval gating was introduced'
 where approval_status is null;

-- From here on every new profile starts pending. `handle_new_user()` does not
-- name the column, so the default is what actually gates new signups.
alter table public.profiles
  alter column approval_status set default 'pending',
  alter column approval_status set not null;

alter table public.profiles
  drop constraint if exists profiles_approval_status_check;

alter table public.profiles
  add constraint profiles_approval_status_check
    check (approval_status in ('pending', 'approved', 'rejected'));

comment on column public.profiles.approval_status is
  'pending | approved | rejected. New signups default to pending; only an admin can change it (see protect_approval_status).';
comment on column public.profiles.approved_by is
  'The admin who decided. Null on grandfathered accounts, which were never actually reviewed.';

create index if not exists profiles_approval_status_idx
  on public.profiles (approval_status)
  where approval_status <> 'approved';

-- Mirrors is_admin(). Used by the mentor-facing edge functions so a pending
-- account cannot issue licences or dispatch signals by calling the API directly.
create or replace function public.is_approved()
returns boolean
language sql
stable
security definer
set search_path to 'public', 'pg_temp'
as $$
  select exists (
    select 1 from public.profiles p
     where p.id = auth.uid()
       and p.approval_status = 'approved'
  );
$$;

comment on function public.is_approved() is
  'True when the calling account has been approved by an administrator.';

-- `profiles` carries "Users can update own profile." (UPDATE, using auth.uid() = id)
-- with no WITH CHECK, so without this trigger a pending mentor could simply
-- update their own row and approve themselves.
--
-- auth.uid() is null for the service role, which is how the admin-approve-mentor
-- edge function writes the decision.
create or replace function public.protect_approval_status()
returns trigger
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $$
begin
  if new.approval_status is distinct from old.approval_status
     or new.approved_by is distinct from old.approved_by
     or new.approved_at is distinct from old.approved_at
  then
    if auth.uid() is not null and not public.is_admin() then
      raise exception 'Only an administrator can change approval status'
        using errcode = 'insufficient_privilege';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists protect_approval_status on public.profiles;

create trigger protect_approval_status
  before update on public.profiles
  for each row
  execute function public.protect_approval_status();
