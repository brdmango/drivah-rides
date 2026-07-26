-- ============================================================
-- DRIVAH CARPOOL — Supabase Schema
-- Run this entire file in your Supabase SQL Editor
-- ============================================================

-- Enable UUID generation
create extension if not exists "uuid-ossp";

-- ─── PROFILES ───────────────────────────────────────────────
-- Created automatically via Supabase Auth trigger
create table if not exists public.profiles (
  id            uuid primary key references auth.users(id) on delete cascade,
  full_name     text not null,
  email         text not null,
  role          text not null check (role in ('rider', 'driver', 'admin')),
  ufid_hash     text,
  phone         text,
  rating        numeric(3,1) default 5.0,
  total_rides   integer default 0,
  created_at    timestamptz default now()
);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.profiles (id, full_name, email, role, ufid_hash, phone)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', 'User'),
    new.email,
    coalesce(new.raw_user_meta_data->>'role', 'rider'),
    new.raw_user_meta_data->>'ufid_hash',
    new.raw_user_meta_data->>'phone'
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ─── DRIVER PROFILES ────────────────────────────────────────
create table if not exists public.driver_profiles (
  id            uuid primary key references public.profiles(id) on delete cascade,
  car_make      text,
  car_model     text,
  car_year      integer,
  plate_number  text,
  status        text default 'approved' check (status in ('approved', 'suspended')),
  rating        numeric(3,1) default 5.0,
  total_rides   integer default 0,
  is_online     boolean default false,
  created_at    timestamptz default now()
);

-- ─── TRIPS ──────────────────────────────────────────────────
create table if not exists public.trips (
  id              uuid primary key default uuid_generate_v4(),
  driver_id       uuid references public.profiles(id) on delete cascade,
  driver_name     text not null,
  driver_rating   numeric(3,1) default 5.0,
  driver_rides    integer default 0,
  origin          text not null,
  destination     text not null,
  depart_at       timestamptz not null,
  seats_total     integer not null check (seats_total between 1 and 6),
  seats_taken     integer default 0 check (seats_taken >= 0),
  distance_miles  numeric(6,1),
  cost_per_seat   numeric(6,2) not null,
  is_recurring    boolean default false,
  detour_ok       boolean default false,
  note            text,
  status          text default 'active' check (status in ('active', 'full', 'cancelled', 'completed')),
  created_at      timestamptz default now()
);

-- Index for common queries
create index if not exists trips_depart_at_idx on public.trips(depart_at);
create index if not exists trips_driver_id_idx on public.trips(driver_id);
create index if not exists trips_status_idx    on public.trips(status);

-- ─── BOOKINGS ───────────────────────────────────────────────
create table if not exists public.bookings (
  id            uuid primary key default uuid_generate_v4(),
  trip_id       uuid references public.trips(id) on delete cascade,
  rider_id      uuid references public.profiles(id) on delete cascade,
  driver_id     uuid,  -- denormalized for quick earnings queries
  amount_paid   numeric(6,2) not null,
  status        text default 'confirmed' check (status in ('confirmed', 'cancelled', 'completed')),
  created_at    timestamptz default now(),
  unique(trip_id, rider_id)  -- one booking per rider per trip
);

create index if not exists bookings_rider_id_idx on public.bookings(rider_id);
create index if not exists bookings_trip_id_idx  on public.bookings(trip_id);

-- Auto-populate driver_id on booking insert
create or replace function public.set_booking_driver()
returns trigger language plpgsql as $$
begin
  select driver_id into new.driver_id from public.trips where id = new.trip_id;
  return new;
end;
$$;

drop trigger if exists set_booking_driver_trigger on public.bookings;
create trigger set_booking_driver_trigger
  before insert on public.bookings
  for each row execute procedure public.set_booking_driver();

-- ─── WALLET ─────────────────────────────────────────────────
create table if not exists public.wallet (
  id          uuid primary key default uuid_generate_v4(),
  user_id     uuid unique references public.profiles(id) on delete cascade,
  balance     numeric(8,2) default 0.00,
  total_saved numeric(8,2) default 0.00,
  updated_at  timestamptz default now()
);

-- ─── NOTIFICATIONS ──────────────────────────────────────────
create table if not exists public.notifications (
  id         uuid primary key default uuid_generate_v4(),
  user_id    uuid references public.profiles(id) on delete cascade,
  type       text,
  title      text not null,
  body       text,
  read       boolean default false,
  created_at timestamptz default now()
);

-- ─── ROW LEVEL SECURITY ─────────────────────────────────────
alter table public.profiles       enable row level security;
alter table public.driver_profiles enable row level security;
alter table public.trips          enable row level security;
alter table public.bookings       enable row level security;
alter table public.wallet         enable row level security;
alter table public.notifications  enable row level security;

-- Profiles: users see all profiles (for driver info on trip cards), edit only own
create policy "profiles_select_all" on public.profiles for select using (true);
create policy "profiles_update_own" on public.profiles for update using (auth.uid() = id);

-- Driver profiles: visible to all, editable by owner
create policy "driver_profiles_select_all" on public.driver_profiles for select using (true);
create policy "driver_profiles_insert_own" on public.driver_profiles for insert with check (auth.uid() = id);
create policy "driver_profiles_update_own" on public.driver_profiles for update using (auth.uid() = id);

-- Trips: visible to all authenticated users, writable by driver
create policy "trips_select_all"   on public.trips for select using (auth.role() = 'authenticated');
create policy "trips_insert_own"   on public.trips for insert with check (auth.uid() = driver_id);
create policy "trips_update_own"   on public.trips for update using (auth.uid() = driver_id);

-- Bookings: riders see own, drivers see their trip bookings
create policy "bookings_select_rider"  on public.bookings for select using (auth.uid() = rider_id or auth.uid() = driver_id);
create policy "bookings_insert_rider"  on public.bookings for insert with check (auth.uid() = rider_id);
create policy "bookings_update_rider"  on public.bookings for update using (auth.uid() = rider_id);

-- Wallet: own only
create policy "wallet_own" on public.wallet for all using (auth.uid() = user_id);

-- Notifications: own only
create policy "notifications_own" on public.notifications for all using (auth.uid() = user_id);

-- ─── REALTIME ───────────────────────────────────────────────
-- Enable realtime for live trip updates and notifications
alter publication supabase_realtime add table public.trips;
alter publication supabase_realtime add table public.notifications;
alter publication supabase_realtime add table public.bookings;

-- ─── SEED: Admin user ───────────────────────────────────────
-- After running this schema, manually create an admin user in
-- Supabase Auth dashboard, then run:
--
-- update public.profiles set role = 'admin' where email = 'your@email.com';
--
-- ============================================================
