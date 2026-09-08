-- Phase 1: Hardening Fixes Migration

-- Add master_key to products
alter table public.products
  add column if not exists master_key text unique;

-- Add allowed_symbols to licenses (ensuring it exists)
alter table public.licenses
  add column if not exists allowed_symbols jsonb default '[]'::jsonb;

-- Create user_credits if it doesn't exist (safety check)
create table if not exists public.user_credits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique,
  credits int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Enable RLS for user_credits
alter table public.user_credits enable row level security;
create policy "Users can view their own credits" on public.user_credits
  for select using (auth.uid() = user_id);

-- RPC for atomic credit deduction
-- This prevents race conditions in generate-license
create or replace function public.deduct_license_credit(p_user_id uuid)
returns boolean as $$
declare
  v_credits int;
begin
  update public.user_credits
  set credits = credits - 1
  where user_id = p_user_id and credits > 0
  returning credits into v_credits;
  
  if v_credits is null then
    return false;
  end if;
  
  return true;
end;
$$ language plpgsql security definer;

-- Signals Table (Ensuring it exists for broadcast)
create table if not exists public.signals (
  id uuid primary key default gen_random_uuid(),
  ea_id text, -- can be product_id or 'MASTER_OVERRIDE'
  pair text not null,
  side text not null, -- BUY | SELL
  lot numeric not null,
  sl numeric,
  tp numeric,
  status text not null default 'pending',
  signal_id text unique, -- for deduplication
  created_at timestamptz not null default now()
);

-- Realtime for signals
alter publication supabase_realtime add table public.signals;
