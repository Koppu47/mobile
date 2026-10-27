-- ==========================================================
-- DIY Car Fluids Guide - Complete Supabase Setup & Seed Script
-- สำหรับรันใน Supabase Dashboard -> SQL Editor
-- Project URL: https://acjcnusbzfjulcigmlwd.supabase.co
-- ==========================================================

-- 1. Enable UUID Extension
create extension if not exists "uuid-ossp";

-- 2. CREATE CATALOG TABLES
create table if not exists public.brands (
  id text primary key,
  name text not null,
  country text not null,
  created_at timestamptz default now()
);

create table if not exists public.car_models (
  id text primary key,
  brand_id text references public.brands(id) on delete cascade,
  name text not null,
  created_at timestamptz default now()
);

create table if not exists public.generations (
  id text primary key,
  model_id text references public.car_models(id) on delete cascade,
  name text not null,
  start_year integer not null,
  end_year integer not null,
  created_at timestamptz default now()
);

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

-- 3. CREATE USER DATA TABLES
create table if not exists public.user_vehicles (
  id text primary key,
  user_id uuid default null,
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
  variant_id text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.maintenance_logs (
  id text primary key,
  user_id uuid default null,
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

create table if not exists public.basic_check_logs (
  id text primary key,
  user_id uuid default null,
  vehicle_id text references public.user_vehicles(id) on delete cascade,
  date date not null default current_date,
  mileage integer not null,
  overall_status text not null check (overall_status in ('normal', 'caution', 'action_needed')),
  results jsonb not null default '[]'::jsonb,
  notes text,
  created_at timestamptz default now()
);

-- 4. ROW LEVEL SECURITY (RLS) POLICIES
alter table public.brands enable row level security;
alter table public.car_models enable row level security;
alter table public.generations enable row level security;
alter table public.vehicle_variants enable row level security;
alter table public.user_vehicles enable row level security;
alter table public.maintenance_logs enable row level security;
alter table public.basic_check_logs enable row level security;

drop policy if exists "Catalog brands readable by anyone" on public.brands;
create policy "Catalog brands readable by anyone" on public.brands for select using (true);

drop policy if exists "Catalog car_models readable by anyone" on public.car_models;
create policy "Catalog car_models readable by anyone" on public.car_models for select using (true);

drop policy if exists "Catalog generations readable by anyone" on public.generations;
create policy "Catalog generations readable by anyone" on public.generations for select using (true);

drop policy if exists "Catalog variants readable by anyone" on public.vehicle_variants;
create policy "Catalog variants readable by anyone" on public.vehicle_variants for select using (true);

drop policy if exists "Allow select user_vehicles" on public.user_vehicles;
create policy "Allow select user_vehicles" on public.user_vehicles for select using (auth.uid() = user_id);

drop policy if exists "Allow insert user_vehicles" on public.user_vehicles;
create policy "Allow insert user_vehicles" on public.user_vehicles for insert with check (auth.uid() = user_id);

drop policy if exists "Allow update user_vehicles" on public.user_vehicles;
create policy "Allow update user_vehicles" on public.user_vehicles for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "Allow delete user_vehicles" on public.user_vehicles;
create policy "Allow delete user_vehicles" on public.user_vehicles for delete using (auth.uid() = user_id);

drop policy if exists "Allow select maintenance_logs" on public.maintenance_logs;
create policy "Allow select maintenance_logs" on public.maintenance_logs for select using (auth.uid() = user_id);

drop policy if exists "Allow insert maintenance_logs" on public.maintenance_logs;
create policy "Allow insert maintenance_logs" on public.maintenance_logs for insert with check (auth.uid() = user_id);

drop policy if exists "Allow update maintenance_logs" on public.maintenance_logs;
create policy "Allow update maintenance_logs" on public.maintenance_logs for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "Allow delete maintenance_logs" on public.maintenance_logs;
create policy "Allow delete maintenance_logs" on public.maintenance_logs for delete using (auth.uid() = user_id);

drop policy if exists "Allow select basic_check_logs" on public.basic_check_logs;
create policy "Allow select basic_check_logs" on public.basic_check_logs for select using (auth.uid() = user_id);

drop policy if exists "Allow insert basic_check_logs" on public.basic_check_logs;
create policy "Allow insert basic_check_logs" on public.basic_check_logs for insert with check (auth.uid() = user_id);

drop policy if exists "Allow update basic_check_logs" on public.basic_check_logs;
create policy "Allow update basic_check_logs" on public.basic_check_logs for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "Allow delete basic_check_logs" on public.basic_check_logs;
create policy "Allow delete basic_check_logs" on public.basic_check_logs for delete using (auth.uid() = user_id);

-- 5. INSERT SEED CATALOG DATA
insert into public.brands (id, name, country) values
  ('b-toyota', 'Toyota', 'Japan'),
  ('b-honda', 'Honda', 'Japan'),
  ('b-nissan', 'Nissan', 'Japan')
on conflict (id) do nothing;

insert into public.car_models (id, brand_id, name) values
  ('m-vios', 'b-toyota', 'Vios'),
  ('m-hilux', 'b-toyota', 'Hilux'),
  ('m-city', 'b-honda', 'City'),
  ('m-civic', 'b-honda', 'Civic'),
  ('m-almera', 'b-nissan', 'Almera'),
  ('m-navara', 'b-nissan', 'Navara')
on conflict (id) do nothing;

insert into public.generations (id, model_id, name, start_year, end_year) values
  ('gen-vios-3', 'm-vios', 'Gen 3 (NCP150 / NSP151)', 2013, 2022),
  ('gen-vios-2', 'm-vios', 'Gen 2 (NCP93)', 2007, 2013),
  ('gen-hilux-revo', 'm-hilux', 'Hilux Revo / Rocco (GUN125 / 126)', 2015, 2024),
  ('gen-hilux-vigo', 'm-hilux', 'Hilux Vigo Champ (KUN25 / 26)', 2004, 2015),
  ('gen-city-5', 'm-city', 'City Gen 5 (GN1 1.0 Turbo)', 2019, 2025),
  ('gen-city-4', 'm-city', 'City Gen 4 (GM6 1.5 i-VTEC)', 2014, 2019),
  ('gen-civic-11', 'm-civic', 'Civic Gen 11 (FE 1.5 Turbo)', 2021, 2025),
  ('gen-civic-10', 'm-civic', 'Civic Gen 10 (FC / FK 1.5 Turbo & 1.8)', 2016, 2021),
  ('gen-almera-4', 'm-almera', 'Almera Gen 4 (N18 1.0 Turbo)', 2019, 2025),
  ('gen-almera-3', 'm-almera', 'Almera Gen 3 (N17 1.2 EcoCar)', 2011, 2019),
  ('gen-navara-np300', 'm-navara', 'Navara NP300 / Pro-4X (D23)', 2015, 2025),
  ('gen-navara-d40', 'm-navara', 'Navara D40 2.5 Calibre', 2007, 2014)
on conflict (id) do nothing;

insert into public.vehicle_variants (id, generation_id, name, engine_code, displacement, fuel_type, transmission_type, transmission_name, drive_type, steering_type) values
  ('var-vios-nsp151-cvt', 'gen-vios-3', '1.5 G / E / Entry (Dual VVT-i)', '2NR-FBE (1.5L Dual VVT-i)', 1496, 'gasoline', 'cvt', 'CVT-i 7 สปีด', 'fwd', 'eps'),
  ('var-vios-ncp93-4at', 'gen-vios-2', '1.5 S / G / E / J (1NZ-FE)', '1NZ-FE (1.5L VVT-i)', 1497, 'gasoline', 'at', 'Super ECT 4-Speed', 'fwd', 'eps'),
  ('var-hilux-revo-24-4wd', 'gen-hilux-revo', '2.4 Rocco / High 4WD Auto', '2GD-FTV (2.4L VN Turbo)', 2393, 'diesel', 'at', '6-Speed Super ECT 4WD', '4wd', 'hydraulic'),
  ('var-city-gn1-turbo', 'gen-city-5', '1.0 VTEC Turbo RS / SV / V / S', 'P10A2 (1.0L VTEC Turbo 3 สูบ)', 988, 'gasoline', 'cvt', 'Earth Dreams CVT', 'fwd', 'eps'),
  ('var-civic-fe-turbo', 'gen-civic-11', '1.5 Turbo RS / EL+ / EL', 'L15BG (1.5L DOHC VTEC Turbo)', 1498, 'gasoline', 'cvt', 'CVT with LL-Step Logic', 'fwd', 'eps'),
  ('var-almera-n18-turbo', 'gen-almera-4', '1.0 Turbo VL / V / EL / E', 'HRA0 (1.0L Turbo DOHC 12V 3 สูบ)', 999, 'gasoline', 'cvt', 'XTRONIC CVT with D-Step', 'fwd', 'eps'),
  ('var-navara-d23-23-4wd', 'gen-navara-np300', 'Pro-4X / VL 4WD 7AT (2.3 Twin Turbo)', 'YS23DDTT (2.3L Twin Turbo Diesel)', 2298, 'diesel', 'at', '7-Speed Automatic', '4wd', 'hydraulic')
on conflict (id) do nothing;

insert into public.user_vehicles (id, nickname, license_plate, brand_name, model_name, generation_name, year, variant_name, engine_code, transmission_name, drive_type, current_mileage, color, notes, variant_id) values
  ('car-vios-demo', 'Vios คันเก่ง', '1กข 4589 กทม.', 'Toyota', 'Vios', 'Gen 3 (NCP150 / NSP151)', 2018, '1.5 G / E / Entry (Dual VVT-i)', '2NR-FBE (1.5L Dual VVT-i)', 'CVT-i 7 สปีด', 'fwd', 58400, 'สีเงิน Silver Metallic', 'ใช้งานเดินทางประจำวันในเมือง', 'var-vios-nsp151-cvt'),
  ('car-hilux-demo', 'Revo สายลุย 4WD', '7กฆ 1234 กทม.', 'Toyota', 'Hilux', 'Hilux Revo / Rocco (GUN125 / 126)', 2021, '2.4 Rocco / High 4WD Auto', '2GD-FTV (2.4L VN Turbo)', '6-Speed Super ECT 4WD', '4wd', 42150, 'สีขาวมุก White Pearl', 'ใช้วิ่งทางไกลและออกทริปต่างจังหวัด', 'var-hilux-revo-24-4wd')
on conflict (id) do nothing;

insert into public.maintenance_logs (id, vehicle_id, category, service_name, date, mileage, product_name, volume_litres, cost_thb, notes) values
  ('log-1', 'car-vios-demo', 'engine_oil', 'เปลี่ยนถ่ายน้ำมันเครื่อง + ไส้กรองแท้', '2026-06-15', 50000, 'Toyota Genuine 0W-20 SP', 3.6, 1450, 'เปลี่ยนกรองแท้ศูนย์')
on conflict (id) do nothing;
