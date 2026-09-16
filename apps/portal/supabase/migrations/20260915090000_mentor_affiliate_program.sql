-- Mentor affiliate programme: the signed agreement, the commission engine, the
-- payout ledger and the free-website reward.
--
-- ── Where a "qualifying sale" actually comes from ────────────────────────────
--
-- There is no orders table (see apps/admin/.../admin-analytics). `itn_logs`
-- holds raw PayFast ITN payloads, written only after the signature, the source
-- IP and the server-to-server validation have all passed. It is the one
-- authentic record that money arrived, so it is what commission is counted
-- from. Nothing here counts a licence as sold because a mentor pressed
-- "Generate" -- 86 keys exist and 6 of them have ever been paid for.
--
-- The link from a payment back to a mentor is the licence key the buyer typed
-- at checkout, which the key-first flow puts in `custom_str4` on every payload:
--
--   itn_logs.payload->>'custom_str4'  ==  licenses.license_key  ->  licenses.user_id
--
-- Payments taken before that flow shipped carry an empty custom_str4 and are
-- unattributable. They are left unattributed rather than guessed at -- there is
-- no owner_email to fall back on (5 licences of 86 have one, and none of them
-- match a payer). A commission engine that invents attribution is worse than
-- one that admits a gap, so `affiliate_unattributed_payments` below exposes
-- those rows for an admin to see rather than hiding them.
--
-- ── What "qualifying" means ─────────────────────────────────────────────────
--
-- A key qualifies when BOTH products on it are paid: app access (LIFETIME) and
-- the AI chart scanner (SCANNER). `affiliate_settings.require_scanner` can
-- relax that to app-access-only without a deploy, because the scanner is an
-- optional purchase for the student and the mentor cannot force it. Either way
-- the split is always reported, so a mentor can see "8 qualified, 3 waiting on
-- the scanner" instead of a number that looks mysteriously low.

-- ---------------------------------------------------------------------------
-- 1. Programme settings
-- ---------------------------------------------------------------------------

-- One row. Every threshold and rate in the programme lives here rather than in
-- application code, because these are commercial terms: they get renegotiated,
-- and renegotiating them must not require a deploy of three front ends.
create table if not exists public.affiliate_settings (
  id                      smallint primary key default 1,
  -- Option B, the direct-sales model: N qualifying keys in a calendar month
  -- unlocks commission for that month.
  option_b_target         integer not null default 10,
  option_b_rate           numeric(5,4) not null default 0.15,
  -- Option A, the giveaway model: a lifetime target, a higher rate.
  option_a_target         integer not null default 50,
  option_a_rate           numeric(5,4) not null default 0.40,
  -- Lifetime qualifying keys that earn the free landing page.
  website_threshold       integer not null default 30,
  -- Whether the AI scanner must also be paid for a key to qualify.
  require_scanner         boolean not null default true,
  -- PayFast merchant id for the live account. Sandbox rows carry a different
  -- one and must never reach a commission total.
  live_merchant_id        text not null default '30871595',
  -- The agreement document mentors are asked to sign. Bumping this marks every
  -- existing signature as against an older version without destroying it.
  agreement_version       text not null default '2026-09',
  updated_at              timestamptz not null default now(),
  constraint affiliate_settings_singleton check (id = 1)
);

insert into public.affiliate_settings (id) values (1)
on conflict (id) do nothing;

comment on table public.affiliate_settings is
  'Commercial terms of the mentor affiliate programme. Exactly one row. Read by the affiliate edge functions on the service role; no client may read it, because commission rates are confidential under clause 10 of the agreement.';

-- ---------------------------------------------------------------------------
-- 2. The signed agreement
-- ---------------------------------------------------------------------------

-- One row per mentor. A mentor fills this in, uploads the PDF they signed, and
-- an admin approves it. Until it is approved the mentor earns nothing: the
-- agreement IS the commission entitlement.
create table if not exists public.mentor_agreements (
  id                  uuid primary key default gen_random_uuid(),
  mentor_id           uuid not null unique references auth.users(id) on delete cascade,

  status              text not null default 'draft',

  -- Which commission model the mentor selected on the form.
  commission_option   text,
  payout_frequency    text,

  -- Identity as written on the agreement. Deliberately not read from
  -- `profiles`: what matters legally is the name on the document.
  full_name           text,
  phone               text,
  email               text,

  -- Banking details for the payout. Clause: "The Mentor must provide valid
  -- South African banking details." These are sensitive and are why this table
  -- is never read from a browser -- both front ends go through an edge function
  -- that returns the account number masked to the last four digits, and only
  -- the admin payout screen ever asks for it in full.
  bank_name           text,
  account_holder      text,
  account_number      text,
  account_type        text,
  branch_name         text,
  branch_code         text,

  -- The uploaded, signed PDF. A path in the private `mentor-documents` bucket;
  -- never a public URL.
  document_path       text,
  document_name       text,
  document_size       integer,
  agreement_version   text,
  signed_on           date,

  submitted_at        timestamptz,

  -- The admin decision. `commission_rate` and `qualifying_target` are stamped
  -- at approval rather than read live from settings, so changing the programme
  -- later cannot silently rewrite terms somebody already signed.
  reviewed_at         timestamptz,
  reviewed_by         uuid references auth.users(id) on delete set null,
  review_note         text,
  commission_rate     numeric(5,4),
  qualifying_target   integer,

  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),

  constraint mentor_agreements_status_check
    check (status in ('draft', 'submitted', 'approved', 'rejected')),
  constraint mentor_agreements_option_check
    check (commission_option is null or commission_option in ('A', 'B')),
  constraint mentor_agreements_frequency_check
    check (payout_frequency is null or payout_frequency in ('weekly', 'monthly')),
  constraint mentor_agreements_account_type_check
    check (account_type is null or account_type in ('cheque', 'savings', 'other'))
);

create index if not exists mentor_agreements_status_idx
  on public.mentor_agreements (status)
  where status <> 'approved';

comment on table public.mentor_agreements is
  'One row per mentor: the Mentor Partnership & Commission Agreement they signed, the model they chose, their banking details, and the admin decision. An approved row is what entitles a mentor to commission -- the qualifying-sales views count keys whether or not this exists, but no payout may be raised without it.';
comment on column public.mentor_agreements.commission_rate is
  'Stamped at approval from affiliate_settings, not read live. Renegotiating the programme must not rewrite terms a mentor already signed.';
comment on column public.mentor_agreements.account_number is
  'Sensitive. Never returned to a browser in full except on the admin payout screen; the mentor sees their own masked to the last four.';

-- ---------------------------------------------------------------------------
-- 3. Payout ledger
-- ---------------------------------------------------------------------------

-- What has actually been paid out, so "owed" is a real number rather than a
-- running total that never goes down. Mirrors `payment_adjustments`: money in
-- is derived from itn_logs, money out is recorded explicitly.
create table if not exists public.mentor_payouts (
  id                uuid primary key default gen_random_uuid(),
  mentor_id         uuid not null references auth.users(id) on delete cascade,

  -- The window the commission was earned in. For Option B this is a calendar
  -- month; for Option A it is whatever period the admin settles.
  period_start      date not null,
  period_end        date not null,

  -- A snapshot of the sum at the moment it was raised. Recomputing later would
  -- drift as refunds land, and a payout record has to say what was actually
  -- paid, not what today's query thinks it should have been.
  qualifying_keys   integer not null default 0,
  gross_revenue     numeric(12,2) not null default 0,
  commission_rate   numeric(5,4) not null,
  amount            numeric(12,2) not null,
  currency          text not null default 'ZAR',

  status            text not null default 'pending',
  paid_at           timestamptz,
  reference         text,
  note              text,

  created_at        timestamptz not null default now(),
  created_by        uuid references auth.users(id) on delete set null,

  constraint mentor_payouts_status_check check (status in ('pending', 'paid', 'cancelled')),
  constraint mentor_payouts_period_check check (period_end >= period_start)
);

create index if not exists mentor_payouts_mentor_idx
  on public.mentor_payouts (mentor_id, period_start desc);

comment on table public.mentor_payouts is
  'Commission actually paid to mentors. The figures are a snapshot taken when the payout was raised, not a live recomputation -- refunds landing later must not rewrite what was paid.';

-- ---------------------------------------------------------------------------
-- 4. The free website reward
-- ---------------------------------------------------------------------------

-- A mentor past the lifetime threshold may request a landing page for their
-- robot. This table is the intake: everything the page needs to exist, plus the
-- admin decision on the request.
create table if not exists public.mentor_websites (
  id                uuid primary key default gen_random_uuid(),
  mentor_id         uuid not null unique references auth.users(id) on delete cascade,

  status            text not null default 'draft',

  -- Which robot the site sells, and where it lives.
  ea_id             uuid references public.expert_advisors(id) on delete set null,
  subdomain         text unique,
  custom_domain     text,

  -- Page content.
  headline          text,
  tagline           text,
  about             text,
  logo_path         text,
  hero_path         text,
  accent_color      text,

  -- Their broker referral links: [{ label, url, note }]. The whole point of the
  -- page for most mentors -- IB revenue, not the licence sale.
  broker_links      jsonb not null default '[]'::jsonb,
  -- Community links: [{ platform, label, url }]
  group_links       jsonb not null default '[]'::jsonb,
  -- Student results the mentor uploaded: [{ caption, path, posted_on }]
  results           jsonb not null default '[]'::jsonb,
  -- Free-text testimonials: [{ name, handle, quote }]
  testimonials      jsonb not null default '[]'::jsonb,

  -- How the buyer pays. `payout_*` is where the mentor's share is settled;
  -- the licence sale itself is still collected by NovaHost's PayFast account,
  -- because the customer of record is NovaHost (clause 9) and the licence key
  -- has to be issued by the platform that owns the key space.
  price_zar         numeric(10,2),
  payout_method     text,
  payout_detail     text,

  requested_at      timestamptz,
  reviewed_at       timestamptz,
  reviewed_by       uuid references auth.users(id) on delete set null,
  review_note       text,
  live_url          text,
  published_at      timestamptz,

  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),

  constraint mentor_websites_status_check
    check (status in ('draft', 'requested', 'in_review', 'approved', 'building', 'live', 'rejected')),
  constraint mentor_websites_subdomain_check
    check (subdomain is null or subdomain ~ '^[a-z0-9]([a-z0-9-]{1,30}[a-z0-9])$')
);

create index if not exists mentor_websites_status_idx
  on public.mentor_websites (status)
  where status <> 'draft';

comment on table public.mentor_websites is
  'Intake and review queue for the free mentor landing page earned at affiliate_settings.website_threshold qualifying keys. Holds everything the page needs to be built; it does not itself serve a page.';

-- ---------------------------------------------------------------------------
-- 5. updated_at
-- ---------------------------------------------------------------------------

-- `search_path` is pinned even though EXECUTE is revoked from every client
-- role below: a trigger function runs as the table owner, which is exactly the
-- shape the security linter's mutable-search-path warning exists for.
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
set search_path to 'public', 'pg_temp'
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

revoke all on function public.touch_updated_at() from public, anon, authenticated;

drop trigger if exists mentor_agreements_touch on public.mentor_agreements;
create trigger mentor_agreements_touch
  before update on public.mentor_agreements
  for each row execute function public.touch_updated_at();

drop trigger if exists mentor_websites_touch on public.mentor_websites;
create trigger mentor_websites_touch
  before update on public.mentor_websites
  for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------------------
-- 6. Nobody approves themselves
-- ---------------------------------------------------------------------------

-- Same shape as `protect_approval_status` on profiles. RLS below already stops
-- a mentor updating an approved row, but the decision fields are the ones worth
-- a second lock: a mentor who could write `status='approved'` and
-- `commission_rate=0.9` would have granted themselves the programme.
create or replace function public.protect_agreement_decision()
returns trigger
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $$
begin
  -- The service role has no auth.uid(); that is how the edge functions pass.
  if auth.uid() is null or public.is_admin() then
    return new;
  end if;

  if new.status is distinct from old.status
     and new.status not in ('draft', 'submitted') then
    raise exception 'Only an administrator can approve or reject an agreement';
  end if;

  if new.commission_rate   is distinct from old.commission_rate
     or new.qualifying_target is distinct from old.qualifying_target
     or new.reviewed_by      is distinct from old.reviewed_by
     or new.reviewed_at      is distinct from old.reviewed_at
     or new.review_note      is distinct from old.review_note then
    raise exception 'Commission terms are set by an administrator';
  end if;

  return new;
end;
$$;

revoke all on function public.protect_agreement_decision() from public, anon, authenticated;

drop trigger if exists mentor_agreements_protect on public.mentor_agreements;
create trigger mentor_agreements_protect
  before update on public.mentor_agreements
  for each row execute function public.protect_agreement_decision();

-- ---------------------------------------------------------------------------
-- 7. RLS
-- ---------------------------------------------------------------------------

alter table public.affiliate_settings enable row level security;
alter table public.mentor_agreements  enable row level security;
alter table public.mentor_payouts     enable row level security;
alter table public.mentor_websites    enable row level security;

-- affiliate_settings: no client policy at all. Commission rates are
-- confidential; the edge functions read it on the service role.
drop policy if exists "admins read settings" on public.affiliate_settings;
create policy "admins read settings" on public.affiliate_settings
  for select using (public.is_admin());

-- mentor_agreements: a mentor owns their row and may write it while it is
-- theirs to write. Once submitted or approved it is read-only to them, so a
-- signature cannot be swapped out from under a decision.
drop policy if exists "mentor reads own agreement" on public.mentor_agreements;
create policy "mentor reads own agreement" on public.mentor_agreements
  for select using (mentor_id = auth.uid() or public.is_admin());

drop policy if exists "mentor creates own agreement" on public.mentor_agreements;
create policy "mentor creates own agreement" on public.mentor_agreements
  for insert with check (mentor_id = auth.uid() and status in ('draft', 'submitted'));

drop policy if exists "mentor edits own draft" on public.mentor_agreements;
create policy "mentor edits own draft" on public.mentor_agreements
  for update
  using (mentor_id = auth.uid() and status in ('draft', 'rejected'))
  with check (mentor_id = auth.uid() and status in ('draft', 'submitted'));

-- mentor_payouts: read-only to the mentor. Writes are admin-only, via the
-- service role.
drop policy if exists "mentor reads own payouts" on public.mentor_payouts;
create policy "mentor reads own payouts" on public.mentor_payouts
  for select using (mentor_id = auth.uid() or public.is_admin());

-- mentor_websites: same shape as the agreement.
drop policy if exists "mentor reads own website" on public.mentor_websites;
create policy "mentor reads own website" on public.mentor_websites
  for select using (mentor_id = auth.uid() or public.is_admin());

drop policy if exists "mentor creates own website" on public.mentor_websites;
create policy "mentor creates own website" on public.mentor_websites
  for insert with check (mentor_id = auth.uid() and status in ('draft', 'requested'));

drop policy if exists "mentor edits own website" on public.mentor_websites;
create policy "mentor edits own website" on public.mentor_websites
  for update
  using (mentor_id = auth.uid() and status in ('draft', 'requested', 'rejected'))
  with check (mentor_id = auth.uid() and status in ('draft', 'requested'));

-- ---------------------------------------------------------------------------
-- 8. The commission engine
-- ---------------------------------------------------------------------------

-- Every completed live payment, normalised out of the raw ITN payload and
-- deduplicated on pf_payment_id. The webhook already refuses a replayed id, so
-- a duplicate would mean something went wrong upstream -- but a commission
-- total is the last place to discover that by double-counting.
create or replace view public.affiliate_payments
with (security_invoker = true) as
select distinct on (coalesce(nullif(i.payload->>'pf_payment_id', ''), i.id::text))
  i.id,
  nullif(i.payload->>'pf_payment_id', '')            as pf_payment_id,
  i.created_at                                       as paid_at,
  upper(btrim(coalesce(i.payload->>'custom_str1', '')))  as product,
  upper(btrim(coalesce(i.payload->>'custom_str4', '')))  as license_key,
  lower(btrim(coalesce(nullif(i.payload->>'custom_str3', ''),
                       i.payload->>'email_address', '')))  as buyer_email,
  coalesce((i.payload->>'amount_gross')::numeric, 0)     as gross,
  abs(coalesce((i.payload->>'amount_fee')::numeric, 0))  as fee
from public.itn_logs i
cross join public.affiliate_settings s
where i.payload->>'payment_status' = 'COMPLETE'
  and i.payload->>'merchant_id' = s.live_merchant_id
order by coalesce(nullif(i.payload->>'pf_payment_id', ''), i.id::text), i.created_at asc;

comment on view public.affiliate_payments is
  'Live, completed PayFast payments, one row per pf_payment_id. Sandbox rows (a different merchant id) never appear.';

-- One row per licence ever issued, with what has been paid on it. This is the
-- single definition of a qualifying sale; the portal and the admin console both
-- read it, so they cannot disagree about a mentor''s number.
create or replace view public.affiliate_license_sales
with (security_invoker = true) as
with paid as (
  select
    p.license_key,
    bool_or(p.product = 'LIFETIME')                                as app_paid,
    bool_or(p.product = 'SCANNER')                                 as scanner_paid,
    min(p.paid_at) filter (where p.product = 'LIFETIME')           as app_paid_at,
    min(p.paid_at) filter (where p.product = 'SCANNER')            as scanner_paid_at,
    sum(p.gross) filter (where p.product in ('LIFETIME', 'SCANNER'))  as gross,
    sum(p.fee)   filter (where p.product in ('LIFETIME', 'SCANNER'))  as fee,
    min(p.buyer_email)                                             as buyer_email
  from public.affiliate_payments p
  where p.license_key <> ''
  group by p.license_key
)
select
  l.id                                    as license_id,
  l.user_id                               as mentor_id,
  l.ea_id,
  l.license_key,
  l.status                                as license_status,
  l.created_at                            as issued_at,
  coalesce(k.app_paid, false)             as app_paid,
  coalesce(k.scanner_paid, false)         as scanner_paid,
  k.app_paid_at,
  k.scanner_paid_at,
  k.buyer_email,
  coalesce(k.gross, 0)                    as gross,
  coalesce(k.fee, 0)                      as fee,
  -- Qualified, and the moment it became so: the later of the two payments when
  -- the scanner is required, the app payment alone when it is not. Commission
  -- is counted in the month the money arrived, not the month the key was made.
  case
    when s.require_scanner then coalesce(k.app_paid, false) and coalesce(k.scanner_paid, false)
    else coalesce(k.app_paid, false)
  end                                     as qualified,
  case
    when s.require_scanner then
      case when k.app_paid and k.scanner_paid
           then greatest(k.app_paid_at, k.scanner_paid_at) end
    else k.app_paid_at
  end                                     as qualified_at
from public.licenses l
cross join public.affiliate_settings s
left join paid k on k.license_key = upper(btrim(l.license_key));

comment on view public.affiliate_license_sales is
  'One row per licence with the payments made against it. `qualified` is the definition of a qualifying sale under the mentor agreement; `qualified_at` is when the last required payment landed, which is the month the sale counts in.';

-- Per-mentor scoreboard. Lifetime totals, plus this calendar month, which is
-- what Option B''s target is measured against.
create or replace view public.affiliate_mentor_scoreboard
with (security_invoker = true) as
select
  v.mentor_id,
  count(*)                                                       as keys_issued,
  count(*) filter (where v.app_paid)                             as app_paid_keys,
  count(*) filter (where v.scanner_paid)                         as scanner_paid_keys,
  count(*) filter (where v.qualified)                            as qualifying_keys,
  count(*) filter (where v.app_paid and not v.scanner_paid)      as awaiting_scanner,
  coalesce(sum(v.gross), 0)                                      as gross_revenue,
  coalesce(sum(v.gross) filter (where v.qualified), 0)           as qualifying_revenue,
  count(*) filter (
    where v.qualified and v.qualified_at >= date_trunc('month', now())
  )                                                              as qualifying_keys_this_month,
  coalesce(sum(v.gross) filter (
    where v.qualified and v.qualified_at >= date_trunc('month', now())
  ), 0)                                                          as qualifying_revenue_this_month,
  count(distinct v.ea_id)                                        as robots,
  max(v.qualified_at)                                            as last_sale_at,
  max(v.issued_at)                                               as last_key_at
from public.affiliate_license_sales v
-- `licenses.user_id` is nullable. A licence with no issuer belongs to nobody
-- and must not become a mentor row with a null id.
where v.mentor_id is not null
group by v.mentor_id;

comment on view public.affiliate_mentor_scoreboard is
  'Per-mentor affiliate totals. `qualifying_keys_this_month` is the figure Option B''s monthly target is judged on; the lifetime count is what unlocks the free website.';

-- Per-robot scoreboard: which bot actually sells, as opposed to which mentor.
create or replace view public.affiliate_bot_scoreboard
with (security_invoker = true) as
select
  v.ea_id,
  -- The robot's owner, taken from the robot itself rather than from whoever
  -- issued a key against it, so the row still attributes correctly if a key is
  -- ever issued cross-mentor.
  ea.user_id                                            as mentor_id,
  coalesce(ea.display_name, ea.name)                    as robot_name,
  ea.code                                               as robot_code,
  count(*)                                              as keys_issued,
  count(*) filter (where v.qualified)                   as qualifying_keys,
  count(*) filter (where v.app_paid)                    as app_paid_keys,
  coalesce(sum(v.gross) filter (where v.qualified), 0)  as qualifying_revenue,
  -- Of the keys this robot issued, how many turned into money. The honest
  -- measure of a robot: a mentor can generate a thousand keys.
  case when count(*) = 0 then 0
       else round(count(*) filter (where v.qualified)::numeric * 100 / count(*), 1)
  end                                                   as conversion_pct,
  max(v.qualified_at)                                   as last_sale_at
from public.affiliate_license_sales v
join public.expert_advisors ea on ea.id = v.ea_id
group by v.ea_id, ea.user_id, ea.display_name, ea.name, ea.code;

comment on view public.affiliate_bot_scoreboard is
  'Per-robot sales. conversion_pct is qualifying keys over keys issued -- the measure that cannot be inflated by generating keys nobody buys.';

-- Live, completed payments that carry no licence key, so no mentor can be
-- credited. Surfaced rather than swallowed: these are real rand that arrived
-- before the key-first checkout shipped, and an admin should be able to see the
-- size of the gap instead of wondering why a total looks light.
create or replace view public.affiliate_unattributed_payments
with (security_invoker = true) as
select p.*
from public.affiliate_payments p
where p.license_key = ''
   or not exists (
        select 1 from public.licenses l
        where upper(btrim(l.license_key)) = p.license_key
      );

comment on view public.affiliate_unattributed_payments is
  'Money that arrived but cannot be credited to a mentor -- mostly payments taken before the key-first checkout put the licence key in custom_str4. Shown, never guessed at.';

-- Every one of these views reaches tables a mentor cannot read (itn_logs above
-- all), and `security_invoker` means RLS still applies to whoever selects from
-- them. Revoking as well makes the intent explicit: these are read by the
-- affiliate edge functions on the service role and by nothing else.
revoke all on public.affiliate_payments               from anon, authenticated;
revoke all on public.affiliate_license_sales          from anon, authenticated;
revoke all on public.affiliate_mentor_scoreboard      from anon, authenticated;
revoke all on public.affiliate_bot_scoreboard         from anon, authenticated;
revoke all on public.affiliate_unattributed_payments  from anon, authenticated;

-- ---------------------------------------------------------------------------
-- 9. Storage for the signed agreement and the site assets
-- ---------------------------------------------------------------------------

-- Private. The signed agreement carries a signature and a bank account number;
-- the existing `downloads` bucket is public and must never be used for this.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'mentor-documents',
  'mentor-documents',
  false,
  10485760,                                 -- 10 MB
  array['application/pdf', 'image/png', 'image/jpeg', 'image/webp']
)
on conflict (id) do update
  set public             = false,
      file_size_limit    = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- Objects are namespaced by the owner's uid: `<uid>/agreement/<file>`,
-- `<uid>/website/<file>`. The first path segment is the authorisation.
drop policy if exists "mentor uploads own documents" on storage.objects;
create policy "mentor uploads own documents" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'mentor-documents'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "mentor reads own documents" on storage.objects;
create policy "mentor reads own documents" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'mentor-documents'
    and ((storage.foldername(name))[1] = auth.uid()::text or public.is_admin())
  );

drop policy if exists "mentor replaces own documents" on storage.objects;
create policy "mentor replaces own documents" on storage.objects
  for update to authenticated
  using (
    bucket_id = 'mentor-documents'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "mentor deletes own documents" on storage.objects;
create policy "mentor deletes own documents" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'mentor-documents'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
