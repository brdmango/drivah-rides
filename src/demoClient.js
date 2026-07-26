/* ─── In-memory stand-in for the Supabase client ─────────────
   Implements only the surface DRIVAH actually uses, so the app
   runs end-to-end with no backend. Activated automatically when
   VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY are missing. */

import { DEMO_USER_ID, seedTables } from './demoData.js'

const tables = seedTables()

// Role chosen on the role-selector screen, so the demo profile matches it.
let demoRole = 'rider'
export const setDemoRole = (role) => { demoRole = role }

let session = null
const authListeners = new Set()
const emitAuth = (event) => authListeners.forEach(cb => cb(event, session))

const uid = () => `demo-${Math.random().toString(36).slice(2, 10)}`
const ok  = (data, count) => ({ data, error: null, count: count ?? null })

const profileFor = (role) => {
  const base = tables.profiles.find(p => p.id === DEMO_USER_ID)
  return { ...base, role, full_name: role === 'admin' ? 'Demo Admin' : base.full_name }
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
    out.driver_profiles = row.driver_profiles || []
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
  gte(col, val) { this.filters.push(r => new Date(r[col]) >= new Date(val)); return this }
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
      return rows.length
        ? ok(rows[0])
        : { data: null, error: { message: 'No rows found' }, count: 0 }
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
      rows.forEach(r => Object.assign(r, this.patch))
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
      return ok(rows)
    },
  }
}

const auth = {
  getSession: async () => ({ data: { session }, error: null }),

  onAuthStateChange: (cb) => {
    authListeners.add(cb)
    return { data: { subscription: { unsubscribe: () => authListeners.delete(cb) } } }
  },

  signInWithPassword: async ({ email }) => {
    const profile = profileFor(demoRole)
    tables.profiles = tables.profiles.map(p => (p.id === DEMO_USER_ID ? { ...p, ...profile, email } : p))
    session = { user: { id: DEMO_USER_ID, email } }
    emitAuth('SIGNED_IN')
    return ok({ user: session.user, session })
  },

  signUp: async ({ email, options }) => {
    const meta = options?.data || {}
    const user = { id: uid(), email }
    tables.profiles.push({
      id: user.id, email,
      full_name: meta.full_name || 'New Gator',
      role: meta.role || 'rider',
      rating: 5.0, total_rides: 0,
    })
    return ok({ user, session: null })
  },

  signOut: async () => { session = null; emitAuth('SIGNED_OUT'); return { error: null } },

  resetPasswordForEmail: async () => ({ data: {}, error: null }),
}

export const demoClient = {
  auth,
  from,
  channel: () => {
    const ch = { on: () => ch, subscribe: () => ch }
    return ch
  },
  removeChannel: () => {},
}
