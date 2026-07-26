-- ============================================================
-- DRIVAH CARPOOL — Supabase Schema
-- Run this entire file in your Supabase SQL Editor
-- ============================================================

create extension if not exists "uuid-ossp";
create extension if not exists pgcrypto;   -- server-side UFID hashing

-- ─── PROFILES ───────────────────────────────────────────────
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

create index if not exists bookings_rider_id_idx  on public.bookings(rider_id);
create index if not exists bookings_trip_id_idx   on public.bookings(trip_id);
create index if not exists bookings_driver_id_idx on public.bookings(driver_id);

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

create index if not exists notifications_user_id_idx on public.notifications(user_id, read);

-- ============================================================
-- SIGNUP PIPELINE
-- ============================================================
-- The client never writes profiles / driver_profiles / wallet rows
-- directly: with email confirmation enabled, signUp() returns a user
-- but no session, so auth.uid() is null and every such insert would be
-- rejected by RLS. These triggers run as the definer instead, so a
-- signup is complete before the user ever confirms their address.

-- Hash the UFID before it is ever persisted. Runs BEFORE insert so the
-- raw value is stripped from user metadata and never lands in auth.users.
create or replace function public.hash_signup_ufid()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_ufid text := new.raw_user_meta_data->>'ufid';
  v_salt text := coalesce(current_setting('app.ufid_salt', true), 'drivah-default-salt');
begin
  if v_ufid is not null then
    new.raw_user_meta_data =
      (new.raw_user_meta_data - 'ufid') ||
      jsonb_build_object('ufid_hash', encode(digest(v_ufid || v_salt, 'sha256'), 'hex'));
  end if;
  return new;
end $$;

drop trigger if exists on_auth_user_hash_ufid on auth.users;
create trigger on_auth_user_hash_ufid
  before insert on auth.users
  for each row execute procedure public.hash_signup_ufid();

-- Create the profile, the wallet, and (for drivers) the vehicle record.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_meta jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  v_role text  := coalesce(v_meta->>'role', 'rider');
begin
  insert into public.profiles (id, full_name, email, role, ufid_hash, phone)
  values (new.id,
          coalesce(v_meta->>'full_name', 'User'),
          new.email,
          v_role,
          v_meta->>'ufid_hash',
          v_meta->>'phone')
  on conflict (id) do nothing;

  insert into public.wallet (user_id) values (new.id)
  on conflict (user_id) do nothing;

  if v_role = 'driver' then
    insert into public.driver_profiles (id, car_make, car_model, car_year, plate_number)
    values (new.id,
            v_meta->>'car_make',
            v_meta->>'car_model',
            nullif(v_meta->>'car_year', '')::integer,
            v_meta->>'plate_number')
    on conflict (id) do nothing;
  end if;

  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ============================================================
-- BOOKING FLOW
-- ============================================================
-- Riders cannot update public.trips (trips_update_own is driver-only),
-- so seat counts are maintained here instead. The row lock also closes
-- the read-then-write race between two riders joining the last seat.

create or replace function public.join_trip(p_trip_id uuid)
returns public.bookings
language plpgsql security definer set search_path = public as $$
declare
  v_trip    public.trips;
  v_booking public.bookings;
  v_name    text;
begin
  if auth.uid() is null then
    raise exception 'You must be signed in to join a trip';
  end if;

  select * into v_trip from public.trips where id = p_trip_id for update;
  if not found                          then raise exception 'Trip not found'; end if;
  if v_trip.status = 'cancelled'        then raise exception 'This trip was cancelled'; end if;
  if v_trip.depart_at < now()           then raise exception 'This trip has already departed'; end if;
  if v_trip.driver_id = auth.uid()      then raise exception 'You cannot join your own trip'; end if;
  if v_trip.seats_taken >= v_trip.seats_total then raise exception 'No seats left on this trip'; end if;

  insert into public.bookings (trip_id, rider_id, driver_id, amount_paid, status)
  values (p_trip_id, auth.uid(), v_trip.driver_id, v_trip.cost_per_seat, 'confirmed')
  returning * into v_booking;

  update public.trips
     set seats_taken = seats_taken + 1,
         status = case when seats_taken + 1 >= seats_total then 'full' else status end
   where id = p_trip_id;

  select full_name into v_name from public.profiles where id = auth.uid();

  insert into public.notifications (user_id, type, title, body)
  values (v_trip.driver_id, 'booking_created', 'New rider joined 🎉',
          coalesce(v_name, 'A rider') || ' joined your trip to ' || v_trip.destination);

  return v_booking;
end $$;

create or replace function public.leave_trip(p_trip_id uuid)
returns void
language plpgsql security definer set search_path = public as $$
declare
  v_trip    public.trips;
  v_removed integer;
  v_name    text;
begin
  if auth.uid() is null then
    raise exception 'You must be signed in';
  end if;

  select * into v_trip from public.trips where id = p_trip_id for update;
  if not found then raise exception 'Trip not found'; end if;

  -- Deleted rather than marked cancelled so unique(trip_id, rider_id)
  -- does not permanently block the rider from rejoining.
  delete from public.bookings where trip_id = p_trip_id and rider_id = auth.uid();
  get diagnostics v_removed = row_count;
  if v_removed = 0 then raise exception 'You are not on this trip'; end if;

  update public.trips
     set seats_taken = greatest(seats_taken - v_removed, 0),
         status = case when status = 'full' then 'active' else status end
   where id = p_trip_id;

  select full_name into v_name from public.profiles where id = auth.uid();

  insert into public.notifications (user_id, type, title, body)
  values (v_trip.driver_id, 'booking_cancelled', 'A rider left your trip',
          coalesce(v_name, 'A rider') || ' left your trip to ' || v_trip.destination);
end $$;

-- Cancelling a trip notifies everyone already booked on it.
create or replace function public.notify_trip_cancelled()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.status = 'cancelled' and old.status is distinct from 'cancelled' then
    insert into public.notifications (user_id, type, title, body)
    select b.rider_id, 'trip_cancelled', 'Trip cancelled ❌',
           'Your ride from ' || new.origin || ' to ' || new.destination ||
           ' on ' || to_char(new.depart_at, 'Mon DD') || ' was cancelled by the driver.'
      from public.bookings b
     where b.trip_id = new.id and b.status = 'confirmed';

    update public.bookings set status = 'cancelled'
     where trip_id = new.id and status = 'confirmed';
  end if;
  return new;
end $$;

drop trigger if exists on_trip_cancelled on public.trips;
create trigger on_trip_cancelled
  after update of status on public.trips
  for each row execute procedure public.notify_trip_cancelled();

-- ============================================================
-- RECURRING TRIPS
-- ============================================================
-- Rolls each past weekly trip forward to its next future slot. Safe to
-- call repeatedly: the source instance is retired as it is cloned, so a
-- trip is never duplicated. Call it from a pg_cron job if available,
-- otherwise the app invokes it when a trip list loads.

create or replace function public.roll_recurring_trips()
returns integer
language plpgsql security definer set search_path = public as $$
declare
  v_count integer := 0;
  r       public.trips;
begin
  for r in
    select * from public.trips
     where is_recurring
       and status in ('active', 'full')
       and depart_at < now()
     for update skip locked
  loop
    insert into public.trips
      (driver_id, driver_name, driver_rating, driver_rides, origin, destination,
       depart_at, seats_total, seats_taken, distance_miles, cost_per_seat,
       is_recurring, detour_ok, note, status)
    values
      (r.driver_id, r.driver_name, r.driver_rating, r.driver_rides, r.origin, r.destination,
       r.depart_at + (ceil(extract(epoch from (now() - r.depart_at)) / 604800)::integer * interval '7 days'),
       r.seats_total, 0, r.distance_miles, r.cost_per_seat,
       true, r.detour_ok, r.note, 'active');

    update public.trips
       set is_recurring = false,
           status = case when status = 'full' then 'completed' else status end
     where id = r.id;

    v_count := v_count + 1;
  end loop;
  return v_count;
end $$;

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
alter table public.profiles        enable row level security;
alter table public.driver_profiles enable row level security;
alter table public.trips           enable row level security;
alter table public.bookings        enable row level security;
alter table public.wallet          enable row level security;
alter table public.notifications   enable row level security;

-- Definer-side admin check, so admin policies do not recurse through RLS.
create or replace function public.is_admin()
returns boolean
language sql security definer stable set search_path = public as $$
  select exists (
    select 1 from public.profiles
     where id = auth.uid() and role = 'admin'
  );
$$;

-- Profiles: users see all profiles (for driver info on trip cards), edit only own
drop policy if exists "profiles_select_all" on public.profiles;
drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_select_all" on public.profiles for select using (true);
create policy "profiles_update_own" on public.profiles for update using (auth.uid() = id);

-- Driver profiles: visible to all, editable by owner
drop policy if exists "driver_profiles_select_all"  on public.driver_profiles;
drop policy if exists "driver_profiles_insert_own"  on public.driver_profiles;
drop policy if exists "driver_profiles_update_own"  on public.driver_profiles;
create policy "driver_profiles_select_all" on public.driver_profiles for select using (true);
create policy "driver_profiles_insert_own" on public.driver_profiles for insert with check (auth.uid() = id);
create policy "driver_profiles_update_own" on public.driver_profiles for update using (auth.uid() = id);

-- Trips: visible to all authenticated users, writable by the driver
drop policy if exists "trips_select_all" on public.trips;
drop policy if exists "trips_insert_own" on public.trips;
drop policy if exists "trips_update_own" on public.trips;
create policy "trips_select_all" on public.trips for select using (auth.role() = 'authenticated');
create policy "trips_insert_own" on public.trips for insert with check (auth.uid() = driver_id);
create policy "trips_update_own" on public.trips for update using (auth.uid() = driver_id);

-- Bookings: riders see their own, drivers see bookings on their trips,
-- admins see everything (the platform dashboard counts them).
drop policy if exists "bookings_select_rider" on public.bookings;
drop policy if exists "bookings_insert_rider" on public.bookings;
drop policy if exists "bookings_update_rider" on public.bookings;
drop policy if exists "bookings_select_admin" on public.bookings;
create policy "bookings_select_rider" on public.bookings for select
  using (auth.uid() = rider_id or auth.uid() = driver_id);
create policy "bookings_select_admin" on public.bookings for select using (public.is_admin());
create policy "bookings_insert_rider" on public.bookings for insert with check (auth.uid() = rider_id);
create policy "bookings_update_rider" on public.bookings for update using (auth.uid() = rider_id);

-- Wallet + notifications: own rows only
drop policy if exists "wallet_own"        on public.wallet;
drop policy if exists "notifications_own" on public.notifications;
create policy "wallet_own"        on public.wallet        for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "notifications_own" on public.notifications for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Only these entry points may be called from the browser.
revoke all on function public.join_trip(uuid)        from public;
revoke all on function public.leave_trip(uuid)       from public;
revoke all on function public.roll_recurring_trips() from public;
grant execute on function public.join_trip(uuid)        to authenticated;
grant execute on function public.leave_trip(uuid)       to authenticated;
grant execute on function public.roll_recurring_trips() to authenticated;

-- ─── REALTIME ───────────────────────────────────────────────
alter publication supabase_realtime add table public.trips;
alter publication supabase_realtime add table public.notifications;
alter publication supabase_realtime add table public.bookings;

-- ============================================================
-- POST-INSTALL
-- ============================================================
-- 1. Set the server-side UFID salt (never exposed to the browser):
--
--    alter database postgres set app.ufid_salt = 'some-long-random-string';
--
--    Then restart the project's database from Settings → General so the
--    new setting is picked up. Without it a default salt is used.
--
-- 2. Create an admin: add the user in Authentication → Users, then run
--
--    update public.profiles set role = 'admin' where email = 'your@email.com';
--
-- 3. Optional — roll recurring trips on a schedule instead of on page load:
--
--    select cron.schedule('roll-recurring', '0 * * * *',
--                         $$select public.roll_recurring_trips()$$);
-- ============================================================
