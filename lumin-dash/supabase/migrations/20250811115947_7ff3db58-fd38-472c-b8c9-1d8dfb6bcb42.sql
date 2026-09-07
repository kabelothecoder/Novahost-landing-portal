-- Enable required extension for UUID generation (usually enabled by default)
create extension if not exists pgcrypto;

-- Products (Expert Advisors)
create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.products enable row level security;

create policy if not exists "Products selectable by anyone" on public.products
for select using (true);

-- Plans
create table if not exists public.plans (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  code text not null,
  name text not null,
  duration_days int, -- null => lifetime
  max_devices int not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(product_id, code)
);

alter table public.plans enable row level security;

create policy if not exists "Plans selectable by anyone" on public.plans
for select using (true);

-- Licenses
create table if not exists public.licenses (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null,
  product_id uuid not null references public.products(id) on delete restrict,
  plan_id uuid not null references public.plans(id) on delete restrict,
  license_key text not null unique,
  status text not null default 'active', -- active | expired | suspended
  issued_at timestamptz not null default now(),
  expires_at timestamptz,
  max_devices int not null default 1,
  metadata jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.licenses enable row level security;

-- RLS: Users can manage their own licenses
create policy if not exists "Users can view their own licenses" on public.licenses
for select using (auth.uid() = owner_id);

create policy if not exists "Users can create their own licenses" on public.licenses
for insert with check (auth.uid() = owner_id);

create policy if not exists "Users can update their own licenses" on public.licenses
for update using (auth.uid() = owner_id);

-- Device activations per license
create table if not exists public.device_activations (
  id uuid primary key default gen_random_uuid(),
  license_id uuid not null references public.licenses(id) on delete cascade,
  device_id text not null,
  activated_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  status text not null default 'active',
  unique(license_id, device_id)
);

alter table public.device_activations enable row level security;

-- RLS: Only owners of the license can access related activations
create policy if not exists "Users can view their device activations" on public.device_activations
for select using (
  exists (
    select 1 from public.licenses l where l.id = license_id and l.owner_id = auth.uid()
  )
);

create policy if not exists "Users can insert their device activations" on public.device_activations
for insert with check (
  exists (
    select 1 from public.licenses l where l.id = license_id and l.owner_id = auth.uid()
  )
);

create policy if not exists "Users can update their device activations" on public.device_activations
for update using (
  exists (
    select 1 from public.licenses l where l.id = license_id and l.owner_id = auth.uid()
  )
);

-- Updated_at triggers
create or replace function public.update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create or replace trigger update_products_updated_at
before update on public.products
for each row execute function public.update_updated_at_column();

create or replace trigger update_plans_updated_at
before update on public.plans
for each row execute function public.update_updated_at_column();

create or replace trigger update_licenses_updated_at
before update on public.licenses
for each row execute function public.update_updated_at_column();

-- Set license expiry automatically based on plan duration
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
    end if
  end if;
  return new;
end;
$$ language plpgsql;

create or replace trigger set_license_expiry
before insert on public.licenses
for each row execute function public.set_license_expiry();

-- Enforce max devices per license
create or replace function public.enforce_max_devices()
returns trigger as $$
declare
  v_max int;
  v_count int;
begin
  select l.max_devices into v_max from public.licenses l where l.id = new.license_id;
  if v_max is null then
    return new;
  end if;
  select count(*) into v_count from public.device_activations da
  where da.license_id = new.license_id and da.status = 'active';
  if v_count >= v_max then
    raise exception 'Maximum devices reached for this license';
  end if;
  return new;
end;
$$ language plpgsql;

create or replace trigger enforce_max_devices
before insert on public.device_activations
for each row execute function public.enforce_max_devices();

-- Seed some default products and plans if they don't exist
insert into public.products (code, name, description)
values
  ('SCALPER_PRO', 'Scalper Pro', 'High-frequency scalping EA'),
  ('TREND_RIDER', 'Trend Rider', 'Trend-following EA'),
  ('GRID_MASTER', 'Grid Master', 'Grid trading EA')
on conflict (code) do nothing;

-- Seed plans per product
insert into public.plans (product_id, code, name, duration_days, max_devices)
select p.id, 'MONTHLY', 'Monthly', 30, 2 from public.products p where p.code in ('SCALPER_PRO','TREND_RIDER','GRID_MASTER')
on conflict do nothing;

insert into public.plans (product_id, code, name, duration_days, max_devices)
select p.id, 'QUARTERLY', 'Quarterly', 90, 2 from public.products p where p.code in ('SCALPER_PRO','TREND_RIDER','GRID_MASTER')
on conflict do nothing;

insert into public.plans (product_id, code, name, duration_days, max_devices)
select p.id, 'LIFETIME', 'Lifetime', null, 3 from public.products p where p.code in ('SCALPER_PRO','TREND_RIDER','GRID_MASTER')
on conflict do nothing;