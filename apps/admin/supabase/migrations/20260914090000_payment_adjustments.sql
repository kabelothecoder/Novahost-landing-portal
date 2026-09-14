-- Revenue has never had a ledger of its own.
--
-- Every rand the business has taken is recorded in `itn_logs` -- the raw
-- PayFast ITN payloads, kept because they are the only authentic record of a
-- payment. That is a fine source for "what came in". It has nothing to say
-- about what went back out: a refund, a chargeback, or a payment that was
-- captured against the wrong email and had to be corrected by hand.
--
-- Without this table the admin portal's revenue number can only ever climb,
-- which makes it a marketing figure rather than an accounting one. One row
-- here is one correction against one payment.

create table if not exists public.payment_adjustments (
  id uuid primary key default gen_random_uuid(),

  -- The PayFast payment being corrected. Text, not a foreign key: the id
  -- belongs to PayFast, `itn_logs` stores it inside a jsonb blob, and a
  -- correction sometimes has to be recorded for a payment whose ITN never
  -- arrived. Nullable for the same reason.
  pf_payment_id text,

  -- Who the money concerns. Always lowercase -- everything else in this
  -- schema keys entitlements off a lowercased email and a mismatch here would
  -- silently orphan the adjustment from the payment it corrects.
  email text not null check (email = lower(email)),

  kind text not null check (kind in ('refund', 'chargeback', 'correction')),

  -- Rand, always positive. A R599 refund is stored as 599, never -599: the
  -- direction is carried by `kind`, so a stray minus sign cannot silently
  -- invert a total.
  amount numeric(12, 2) not null check (amount > 0),

  currency text not null default 'ZAR',

  -- Why. Free text, and required: an unexplained adjustment to a revenue
  -- figure is worse than no adjustment at all.
  note text not null check (length(trim(note)) > 0),

  created_at timestamptz not null default now(),
  created_by uuid references auth.users (id) on delete set null
);

create index if not exists payment_adjustments_email_idx
  on public.payment_adjustments (email);
create index if not exists payment_adjustments_created_at_idx
  on public.payment_adjustments (created_at desc);
create index if not exists payment_adjustments_pf_payment_id_idx
  on public.payment_adjustments (pf_payment_id)
  where pf_payment_id is not null;

comment on table public.payment_adjustments is
  'Corrections against PayFast payments -- refunds, chargebacks and manual fixes. Subtracted from gross in the admin revenue view. itn_logs records money in; this records money back out.';

-- ---------------------------------------------------------------------------
-- RLS: admins only, and not even them from the browser.
--
-- The table is readable and writable by `is_admin()` accounts so that a future
-- direct query works, but the admin portal goes through an edge function on
-- the service role regardless. Two locks on the same door: an anon key that
-- leaks buys nothing here.
-- ---------------------------------------------------------------------------
alter table public.payment_adjustments enable row level security;

drop policy if exists "Admins read payment adjustments" on public.payment_adjustments;
create policy "Admins read payment adjustments"
  on public.payment_adjustments
  for select
  to authenticated
  using (public.is_admin());

drop policy if exists "Admins write payment adjustments" on public.payment_adjustments;
create policy "Admins write payment adjustments"
  on public.payment_adjustments
  for insert
  to authenticated
  with check (public.is_admin());

drop policy if exists "Admins delete payment adjustments" on public.payment_adjustments;
create policy "Admins delete payment adjustments"
  on public.payment_adjustments
  for delete
  to authenticated
  using (public.is_admin());

-- An adjustment is a historical fact. Correcting one means deleting it and
-- writing a new one, so there is no UPDATE policy on purpose.

revoke all on public.payment_adjustments from anon;
