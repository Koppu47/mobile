-- ==========================================================
-- DIY Car Fluids Guide - Supabase Database Schema
-- ตามข้อกำหนดใน BRIEF.md และ AGENTS.md
-- ==========================================================

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- 1. Brands
create table if not exists public.brands (
  id text primary key,
  name text not null,
  country text not null,
  created_at timestamptz default now()
);

-- 2. Car Models
create table if not exists public.car_models (
  id text primary key,
  brand_id text references public.brands(id) on delete cascade,
  name text not null,
  created_at timestamptz default now()
);

-- 3. Generations / โฉมรถ
create table if not exists public.generations (
  id text primary key,
  model_id text references public.car_models(id) on delete cascade,
  name text not null,
  start_year integer not null,
  end_year integer not null,
  created_at timestamptz default now()
);

-- 4. Vehicle Variants
create table if not exists public.vehicle_variants (
  id text primary key,
  generation_id text references public.generations(id) on delete cascade,
  name text not null,
  engine_code text not null,
  displacement integer not null,
  fuel_type text not null,
  transmission_type text not null,
  transmission_name text not null,
  drive_type text not null check (drive_type in ('fwd', 'rwd', '4wd', 'awd')),
  steering_type text not null check (steering_type in ('hydraulic', 'eps', 'electro_hydraulic')),
  created_at timestamptz default now()
);

-- 5. User Profiles
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  display_name text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 6. User Vehicles (รถของผู้ใช้)
create table if not exists public.user_vehicles (
  id text primary key default concat('car-', uuid_generate_v4()::text),
  user_id uuid references auth.users(id) on delete cascade,
  nickname text,
  license_plate text not null,
  brand_name text not null,
  model_name text not null,
  generation_name text not null,
  year integer not null,
  variant_name text not null,
  engine_code text not null,
  transmission_name text not null,
  drive_type text not null,
  current_mileage integer not null default 0,
  color text,
  notes text,
  variant_id text references public.vehicle_variants(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 7. Maintenance Logs (ประวัติการบำรุงรักษา)
create table if not exists public.maintenance_logs (
  id text primary key default concat('log-', uuid_generate_v4()::text),
  user_id uuid references auth.users(id) on delete cascade,
  vehicle_id text references public.user_vehicles(id) on delete cascade,
  category text not null,
  service_name text not null,
  date date not null default current_date,
  mileage integer not null,
  product_name text not null,
  volume_litres numeric(5,2),
  cost_thb numeric(10,2) not null default 0,
  notes text,
  photo_url text,
  created_at timestamptz default now()
);

-- 8. Basic Check Logs (ประวัติการตรวจเช็กรถ)
create table if not exists public.basic_check_logs (
  id text primary key default concat('chk-', uuid_generate_v4()::text),
  user_id uuid references auth.users(id) on delete cascade,
  vehicle_id text references public.user_vehicles(id) on delete cascade,
  date date not null default current_date,
  mileage integer not null,
  overall_status text not null check (overall_status in ('normal', 'caution', 'action_needed')),
  results jsonb not null default '[]'::jsonb,
  notes text,
  created_at timestamptz default now()
);

-- 9. Row Level Security (RLS)
alter table public.user_vehicles enable row level security;
alter table public.maintenance_logs enable row level security;
alter table public.basic_check_logs enable row level security;
alter table public.profiles enable row level security;

-- Policies: Users can view and manage their own data
create policy "Users can view own vehicles" on public.user_vehicles
  for select using (auth.uid() = user_id);

create policy "Users can insert own vehicles" on public.user_vehicles
  for insert with check (auth.uid() = user_id);

create policy "Users can update own vehicles" on public.user_vehicles
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "Users can delete own vehicles" on public.user_vehicles
  for delete using (auth.uid() = user_id);

create policy "Users can view own logs" on public.maintenance_logs
  for select using (auth.uid() = user_id);

create policy "Users can insert own logs" on public.maintenance_logs
  for insert with check (auth.uid() = user_id);

create policy "Users can update own logs" on public.maintenance_logs
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "Users can delete own logs" on public.maintenance_logs
  for delete using (auth.uid() = user_id);

create policy "Users can view own checks" on public.basic_check_logs
  for select using (auth.uid() = user_id);

create policy "Users can insert own checks" on public.basic_check_logs
  for insert with check (auth.uid() = user_id);

create policy "Users can update own checks" on public.basic_check_logs
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "Users can delete own checks" on public.basic_check_logs
  for delete using (auth.uid() = user_id);
