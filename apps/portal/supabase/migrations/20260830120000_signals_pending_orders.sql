-- Pending order support for mentor signals.
--
-- `metacopier-execute` has always been able to place the four pending variants
-- (BuyLimit, SellLimit, BuyStop, SellStop) — it takes `order_type`,
-- `open_price` and `pending_expiry_seconds` and rejects a pending type sent
-- without a price. Nothing upstream could express one: `broadcast-signal` wrote
-- only side/pair/lot/sl/tp, so every mentor call was necessarily a market
-- order.
--
-- These two columns close that gap. The entry price reuses the existing
-- `signals.price` column: nothing reads it, and of the 24 rows on this database
-- exactly one carries a value — a literal `0` written by a `broadcast-signal`
-- build that has since been replaced. The column is therefore free to carry the
-- meaning its name already implies, and that one row is a market order like
-- every other existing row.

alter table public.signals
  add column if not exists order_type text
    not null default 'MARKET'
    check (order_type in ('MARKET', 'LIMIT', 'STOP')),
  add column if not exists pending_expiry_seconds integer
    check (pending_expiry_seconds is null or pending_expiry_seconds > 0);

comment on column public.signals.order_type is
  'MARKET | LIMIT | STOP. Maps to toOrderType() in metacopier-execute, which combines it with side to produce the MetaCopier enum.';

comment on column public.signals.price is
  'Entry price for LIMIT and STOP orders. Null for MARKET, which fills at whatever the subscriber''s broker is showing.';

comment on column public.signals.pending_expiry_seconds is
  'Lifetime of a pending order in seconds. Null means good till cancelled.';

-- A pending order without a level is not executable, so it must not be
-- storable either. Existing rows all predate this feature and are MARKET by
-- virtue of the default, so the constraint holds on backfill.
alter table public.signals
  drop constraint if exists signals_pending_needs_price;

alter table public.signals
  add constraint signals_pending_needs_price
  check (order_type = 'MARKET' or price is not null)
  not valid;

alter table public.signals validate constraint signals_pending_needs_price;
