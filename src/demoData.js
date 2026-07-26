/* ─── Seed data for demo mode ───────────────────────────────
   Used only when Supabase env vars are absent, so the site is
   fully browsable without a backend. Never touched in production. */

const hours = (n) => new Date(Date.now() + n * 3600000).toISOString()
const days  = (n) => new Date(Date.now() + n * 86400000).toISOString()

export const DEMO_USER_ID = 'demo-user'

export const demoTrips = [
  {
    id: 't1', driver_id: 'd1', driver_name: 'Maya Rodriguez', driver_rating: 4.9, driver_rides: 42,
    origin: 'Beaty Towers', destination: 'Orlando International Airport',
    depart_at: days(1), seats_total: 4, seats_taken: 2,
    distance_miles: 118, cost_per_seat: 6.2, is_recurring: false, detour_ok: true,
    note: 'Leaving right after my 8am final — bring a carry-on only please.',
    status: 'active', created_at: hours(-6), bookings: [{ count: 2 }],
  },
  {
    id: 't2', driver_id: 'd2', driver_name: 'Jordan Blake', driver_rating: 5.0, driver_rides: 17,
    origin: 'Reitz Union', destination: 'Butler Plaza',
    depart_at: hours(5), seats_total: 3, seats_taken: 1,
    distance_miles: 4.2, cost_per_seat: 1.5, is_recurring: true, detour_ok: false,
    note: null,
    status: 'active', created_at: hours(-20), bookings: [{ count: 1 }],
  },
  {
    id: 't3', driver_id: 'd3', driver_name: 'Priya Nair', driver_rating: 4.8, driver_rides: 63,
    origin: 'Sorority Row', destination: 'Tampa — USF Area',
    depart_at: days(2), seats_total: 4, seats_taken: 4,
    distance_miles: 132, cost_per_seat: 6.93, is_recurring: false, detour_ok: true,
    note: 'Trunk space is tight, one bag each.',
    status: 'active', created_at: hours(-30), bookings: [{ count: 4 }],
  },
  {
    id: 't4', driver_id: DEMO_USER_ID, driver_name: 'Demo Driver', driver_rating: 5.0, driver_rides: 8,
    origin: 'Lakeside Complex', destination: 'Jacksonville Beach',
    depart_at: days(3), seats_total: 4, seats_taken: 1,
    distance_miles: 76, cost_per_seat: 3.99, is_recurring: false, detour_ok: true,
    note: 'Beach day — back by 8pm.',
    status: 'active', created_at: hours(-2), bookings: [{ count: 1 }],
  },
  {
    id: 't5', driver_id: DEMO_USER_ID, driver_name: 'Demo Driver', driver_rating: 5.0, driver_rides: 8,
    origin: 'Hume Hall', destination: 'Gainesville Regional Airport',
    depart_at: hours(-48), seats_total: 3, seats_taken: 3,
    distance_miles: 9.5, cost_per_seat: 1.5, is_recurring: false, detour_ok: false,
    note: null,
    status: 'active', created_at: hours(-96), bookings: [{ count: 3 }],
  },
]

export const demoProfiles = [
  {
    id: DEMO_USER_ID, email: 'demo@ufl.edu', full_name: 'Demo Gator', role: 'rider',
    rating: 5.0, total_rides: 3,
    car_make: 'Toyota', car_model: 'Corolla', car_year: 2021, plate_number: 'GTR-2024',
    driver_profiles: [{ car_make: 'Toyota', car_model: 'Corolla', car_year: 2021, plate_number: 'GTR-2024' }],
  },
  { id: 'd1', email: 'maya@ufl.edu',  full_name: 'Maya Rodriguez', role: 'driver', rating: 4.9, total_rides: 42 },
  { id: 'd2', email: 'jordan@ufl.edu', full_name: 'Jordan Blake',  role: 'driver', rating: 5.0, total_rides: 17 },
  { id: 'd3', email: 'priya@ufl.edu',  full_name: 'Priya Nair',    role: 'driver', rating: 4.8, total_rides: 63 },
  { id: 'r1', email: 'chris@ufl.edu',  full_name: 'Chris Doyle',   role: 'rider',  rating: 5.0, total_rides: 11 },
  { id: 'r2', email: 'sam@ufl.edu',    full_name: 'Sam Whitfield', role: 'rider',  rating: 4.7, total_rides: 5 },
]

export const demoBookings = [
  { id: 'b1', trip_id: 't2', rider_id: DEMO_USER_ID, driver_id: 'd2', amount_paid: 1.5,  status: 'confirmed', created_at: hours(-20) },
  { id: 'b2', trip_id: 't5', rider_id: 'r1', driver_id: DEMO_USER_ID, amount_paid: 1.5,  status: 'confirmed', created_at: hours(-50) },
  { id: 'b3', trip_id: 't5', rider_id: 'r2', driver_id: DEMO_USER_ID, amount_paid: 1.5,  status: 'confirmed', created_at: hours(-50) },
  { id: 'b4', trip_id: 't4', rider_id: 'r1', driver_id: DEMO_USER_ID, amount_paid: 3.99, status: 'confirmed', created_at: hours(-2) },
]

export const demoWallet = [
  { id: 'w1', user_id: DEMO_USER_ID, balance: 24.5, total_saved: 187.4 },
]

export const seedTables = () => ({
  trips:           demoTrips.map(t => ({ ...t })),
  profiles:        demoProfiles.map(p => ({ ...p })),
  bookings:        demoBookings.map(b => ({ ...b })),
  wallet:          demoWallet.map(w => ({ ...w })),
  driver_profiles: [],
  notifications:   [],
})
