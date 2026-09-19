-- Recreate the licence-expiry machinery that never made it into version
-- control. public.licenses currently has zero triggers, so expires_at is
-- always null no matter which plan a key is issued against. The bodies below
-- are copied verbatim from 20250811120342_ce515309-bfc0-432b-86bf-4c7c7e84f0f7.sql
-- (still correct after the products -> expert_advisors rename, since neither
-- function ever referenced that table by name).

-- 1. updated_at bookkeeping on licenses (was silently missing alongside the
--    expiry trigger, for the same reason: never re-applied to this project).
create or replace function public.update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create or replace trigger update_licenses_updated_at
before update on public.licenses
for each row execute function public.update_updated_at_column();

-- 2. Derive expires_at from the chosen plan's duration_days at insert time.
--    Null duration means lifetime -- this is why every existing key (all
--    issued against a null-duration LIFETIME plan) is unaffected by adding
--    this trigger now: v_duration resolves to null for every one of them.
create or replace function public.set_license_expiry()
returns trigger as $$
declare
  v_duration int;
begin
  if new.expires_at is null then
    select p.duration_days into v_duration from public.plans p where p.id = new.plan_id;
    if v_duration is null then
      new.expires_at := null; -- lifetime
    else
      new.expires_at := (coalesce(new.issued_at, now())) + make_interval(days => v_duration);
    end if;
  end if;
  return new;
end;
$$ language plpgsql;

create or replace trigger set_license_expiry
before insert on public.licenses
for each row execute function public.set_license_expiry();

-- 3. Give every already-registered robot a 1 Week and 1 Month plan alongside
--    its existing Lifetime plan. manage-eas is updated separately to create
--    all three for robots registered from now on; this backfills the ones
--    already live. max_devices is copied from each robot's own Lifetime
--    plan rather than hardcoded, in case that is ever not 1.
insert into public.plans (product_id, code, name, duration_days, max_devices)
select ea.id, 'WEEK', '1 Week', 7, lifetime.max_devices
from public.expert_advisors ea
join public.plans lifetime on lifetime.product_id = ea.id and lifetime.code = 'LIFETIME'
on conflict (product_id, code) do nothing;

insert into public.plans (product_id, code, name, duration_days, max_devices)
select ea.id, 'MONTH', '1 Month', 30, lifetime.max_devices
from public.expert_advisors ea
join public.plans lifetime on lifetime.product_id = ea.id and lifetime.code = 'LIFETIME'
on conflict (product_id, code) do nothing;
