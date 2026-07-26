/* ─── In-memory stand-in for the Supabase client ─────────────
   Implements only the surface DRIVAH actually uses, so the app
   runs end-to-end with no backend. Activated automatically when
   VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY are missing.

   The rpc() handlers mirror the security-definer functions in
   drivah-schema.sql — including their guard clauses — so demo mode
   surfaces the same errors the real backend would. */

import { DEMO_USER_ID, seedTables } from './demoData.js'

const tables = seedTables()

/* The seeded tables are deliberately in-memory (demo data resets on reload),
   but the session is persisted so a refresh behaves like the real client:
   you stay signed in, and admins are re-prompted for the PIN rather than
   dropped back at the role selector. */
const SESSION_KEY = 'drivah-demo-session'

const readStored = () => {
  try { return JSON.parse(sessionStorage.getItem(SESSION_KEY) || 'null') } catch { return null }
}
const writeStored = () => {
  try {
    if (session) sessionStorage.setItem(SESSION_KEY, JSON.stringify({ session, role: demoRole }))
    else sessionStorage.removeItem(SESSION_KEY)
  } catch { /* private mode — demo just won't survive reload */ }
}

const stored = readStored()

// Role chosen on the role-selector screen, so the demo profile matches it.
let demoRole = stored?.role || 'rider'
export const setDemoRole = (role) => { demoRole = role; writeStored() }

let session = stored?.session || null
const authListeners = new Set()
const emitAuth = (event) => authListeners.forEach(cb => cb(event, session))

const uid = () => `demo-${Math.random().toString(36).slice(2, 10)}`
const ok  = (data, count) => ({ data, error: null, count: count ?? null })
const err = (message) => ({ data: null, error: { message }, count: null })

const profileFor = (role) => {
  const base = tables.profiles.find(p => p.id === DEMO_USER_ID)
  return { ...base, role, full_name: role === 'admin' ? 'Demo Admin' : base.full_name }
}

/* Stamp the chosen role onto the demo profile, and give drivers a vehicle
   row so the profile tab resolves it the same way production does. */
const applyDemoRole = (email) => {
  const profile = profileFor(demoRole)
  tables.profiles = tables.profiles.map(p =>
    p.id === DEMO_USER_ID ? { ...p, ...profile, email: email || p.email } : p)
  if (demoRole === 'driver' && !tables.driver_profiles.some(d => d.id === DEMO_USER_ID)) {
    tables.driver_profiles.push({
      id: DEMO_USER_ID, car_make: 'Toyota', car_model: 'Corolla',
      car_year: 2021, plate_number: 'GTR-2024', status: 'approved',
    })
  }
}

// Restore the role onto the freshly seeded tables after a reload.
if (session) applyDemoRole(session.user?.email)

/* ─── Realtime ─────────────────────────────────────────────── */
const channels = new Set()

/* Mirrors `filter: 'user_id=eq.<uuid>'` from postgres_changes. */
const filterMatches = (filter, row) => {
  if (!filter) return true
  const m = /^(\w+)=eq\.(.*)$/.exec(filter)
  return m ? String(row[m[1]]) === m[2] : true
}

const emitInsert = (table, row) => {
  channels.forEach(ch => ch.handlers.forEach(h => {
    if (h.cfg.table === table && (h.cfg.event === '*' || h.cfg.event === 'INSERT') &&
        filterMatches(h.cfg.filter, row)) {
      setTimeout(() => h.cb({ eventType: 'INSERT', new: row }), 0)
    }
  }))
}

const notify = (userId, type, title, body) => {
  if (!userId) return
  const row = { id: uid(), user_id: userId, type, title, body, read: false, created_at: new Date().toISOString() }
  tables.notifications.push(row)
  emitInsert('notifications', row)
}

/* Attach the embedded relations the app selects for. */
function withRelations(table, row, columns) {
  const out = { ...row }
  if (table === 'bookings' && columns.includes('trips(')) {
    out.trips = tables.trips.find(t => t.id === row.trip_id) || null
  }
  if (table === 'trips' && columns.includes('bookings(count)')) {
    out.bookings = [{ count: tables.bookings.filter(b => b.trip_id === row.id).length }]
  }
  if (table === 'profiles' && columns.includes('driver_profiles(')) {
    out.driver_profiles = tables.driver_profiles.filter(d => d.id === row.id)
  }
  return out
}

/* Thenable query builder — awaiting it runs the query. */
class Query {
  constructor(table, columns = '*', opts = {}) {
    this.table   = table
    this.columns = columns
    this.opts    = opts
    this.filters = []
    this.sort    = null
    this.max     = null
    this.one     = false
  }

  eq(col, val)  { this.filters.push(r => String(r[col]) === String(val)); return this }
  neq(col, val) { this.filters.push(r => String(r[col]) !== String(val)); return this }
  gte(col, val) { this.filters.push(r => new Date(r[col]) >= new Date(val)); return this }
  in(col, vals) { this.filters.push(r => vals.map(String).includes(String(r[col]))); return this }
  order(col, { ascending = true } = {}) { this.sort = { col, ascending }; return this }
  limit(n)      { this.max = n; return this }
  single()      { this.one = true; return this }

  run() {
    let rows = (tables[this.table] || []).filter(r => this.filters.every(f => f(r)))
    if (this.sort) {
      const { col, ascending } = this.sort
      rows = [...rows].sort((a, b) => {
        const av = a[col], bv = b[col]
        const cmp = av === bv ? 0 : av > bv ? 1 : -1
        return ascending ? cmp : -cmp
      })
    }
    const count = rows.length
    if (this.max != null) rows = rows.slice(0, this.max)
    rows = rows.map(r => withRelations(this.table, r, this.columns))

    if (this.one) {
      return rows.length ? ok(rows[0]) : { data: null, error: { message: 'No rows found' }, count: 0 }
    }
    return ok(rows, count)
  }

  then(resolve, reject) {
    return Promise.resolve().then(() => this.run()).then(resolve, reject)
  }
}

/* update(...) returns a filterable, awaitable handle. */
class Mutation {
  constructor(table, patch) {
    this.table   = table
    this.patch   = patch
    this.filters = []
  }
  eq(col, val) { this.filters.push(r => String(r[col]) === String(val)); return this }
  then(resolve, reject) {
    return Promise.resolve().then(() => {
      const rows = (tables[this.table] || []).filter(r => this.filters.every(f => f(r)))
      rows.forEach(r => {
        const before = r.status
        Object.assign(r, this.patch)
        // Mirrors the on_trip_cancelled trigger.
        if (this.table === 'trips' && r.status === 'cancelled' && before !== 'cancelled') {
          tables.bookings
            .filter(b => b.trip_id === r.id && b.status === 'confirmed')
            .forEach(b => {
              b.status = 'cancelled'
              notify(b.rider_id, 'trip_cancelled', 'Trip cancelled ❌',
                `Your ride from ${r.origin} to ${r.destination} was cancelled by the driver.`)
            })
        }
      })
      return ok(rows)
    }).then(resolve, reject)
  }
}

function from(table) {
  return {
    select: (columns = '*', opts = {}) => new Query(table, columns, opts),
    update: (patch) => new Mutation(table, patch),
    insert: async (payload) => {
      const rows = (Array.isArray(payload) ? payload : [payload])
        .map(r => ({ id: uid(), created_at: new Date().toISOString(), ...r }))
      tables[table] = [...(tables[table] || []), ...rows]
      rows.forEach(r => emitInsert(table, r))
      return ok(rows)
    },
  }
}

/* ─── RPC — mirrors the SQL security-definer functions ──────── */
const rpcHandlers = {
  join_trip: ({ p_trip_id }) => {
    if (!session) return err('You must be signed in to join a trip')
    const trip = tables.trips.find(t => t.id === p_trip_id)
    if (!trip)                                   return err('Trip not found')
    if (trip.status === 'cancelled')             return err('This trip was cancelled')
    if (new Date(trip.depart_at) < new Date())   return err('This trip has already departed')
    if (trip.driver_id === session.user.id)      return err('You cannot join your own trip')
    if ((trip.seats_taken || 0) >= trip.seats_total) return err('No seats left on this trip')
    if (tables.bookings.some(b => b.trip_id === trip.id && b.rider_id === session.user.id))
      return err('You have already joined this trip')

    const booking = {
      id: uid(), trip_id: trip.id, rider_id: session.user.id, driver_id: trip.driver_id,
      amount_paid: trip.cost_per_seat, status: 'confirmed', created_at: new Date().toISOString(),
    }
    tables.bookings.push(booking)
    trip.seats_taken = (trip.seats_taken || 0) + 1
    if (trip.seats_taken >= trip.seats_total) trip.status = 'full'

    const me = tables.profiles.find(p => p.id === session.user.id)
    notify(trip.driver_id, 'booking_created', 'New rider joined 🎉',
      `${me?.full_name || 'A rider'} joined your trip to ${trip.destination}`)
    return ok(booking)
  },

  leave_trip: ({ p_trip_id }) => {
    if (!session) return err('You must be signed in')
    const trip = tables.trips.find(t => t.id === p_trip_id)
    if (!trip) return err('Trip not found')

    const before = tables.bookings.length
    tables.bookings = tables.bookings.filter(
      b => !(b.trip_id === p_trip_id && b.rider_id === session.user.id))
    const removed = before - tables.bookings.length
    if (removed === 0) return err('You are not on this trip')

    trip.seats_taken = Math.max((trip.seats_taken || 0) - removed, 0)
    if (trip.status === 'full') trip.status = 'active'

    const me = tables.profiles.find(p => p.id === session.user.id)
    notify(trip.driver_id, 'booking_cancelled', 'A rider left your trip',
      `${me?.full_name || 'A rider'} left your trip to ${trip.destination}`)
    return ok(null)
  },

  roll_recurring_trips: () => {
    let rolled = 0
    const week = 604800000
    tables.trips
      .filter(t => t.is_recurring && ['active', 'full'].includes(t.status) && new Date(t.depart_at) < new Date())
      .forEach(t => {
        const gap = Date.now() - new Date(t.depart_at).getTime()
        tables.trips.push({
          ...t, id: uid(), seats_taken: 0, status: 'active',
          depart_at: new Date(new Date(t.depart_at).getTime() + Math.ceil(gap / week) * week).toISOString(),
          created_at: new Date().toISOString(),
        })
        t.is_recurring = false
        if (t.status === 'full') t.status = 'completed'
        rolled++
      })
    return ok(rolled)
  },
}

const rpc = async (name, args = {}) =>
  rpcHandlers[name] ? rpcHandlers[name](args) : err(`Unknown function ${name}`)

/* ─── Auth ─────────────────────────────────────────────────── */
const auth = {
  getSession: async () => ({ data: { session }, error: null }),

  onAuthStateChange: (cb) => {
    authListeners.add(cb)
    return { data: { subscription: { unsubscribe: () => authListeners.delete(cb) } } }
  },

  signInWithPassword: async ({ email }) => {
    applyDemoRole(email)
    session = { user: { id: DEMO_USER_ID, email } }
    writeStored()
    emitAuth('SIGNED_IN')
    return ok({ user: session.user, session })
  },

  // Mirrors the handle_new_user trigger: profile, wallet and (for drivers)
  // the vehicle row are all created server-side from signup metadata.
  signUp: async ({ email, options }) => {
    const meta = options?.data || {}
    const user = { id: uid(), email }
    tables.profiles.push({
      id: user.id, email,
      full_name: meta.full_name || 'New Gator',
      role: meta.role || 'rider',
      rating: 5.0, total_rides: 0,
    })
    tables.wallet.push({ id: uid(), user_id: user.id, balance: 0, total_saved: 0 })
    if (meta.role === 'driver') {
      tables.driver_profiles.push({
        id: user.id, car_make: meta.car_make, car_model: meta.car_model,
        car_year: meta.car_year ? parseInt(meta.car_year) : null,
        plate_number: meta.plate_number, status: 'approved',
      })
    }
    return ok({ user, session: null })
  },

  updateUser: async () => ok({ user: session?.user || null }),

  signOut: async () => { session = null; writeStored(); emitAuth('SIGNED_OUT'); return { error: null } },

  resetPasswordForEmail: async () => ({ data: {}, error: null }),
}

export const demoClient = {
  auth,
  from,
  rpc,
  channel: () => {
    const ch = {
      handlers: [],
      on(_type, cfg, cb) { this.handlers.push({ cfg, cb }); return this },
      subscribe() { channels.add(this); return this },
    }
    return ch
  },
  removeChannel: (ch) => channels.delete(ch),
}
