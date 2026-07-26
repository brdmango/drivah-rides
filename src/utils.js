export const isUFEmail  = (e) => e.trim().toLowerCase().endsWith('@ufl.edu')
export const isValidUID = (u) => /^\d{8}$/.test(u.trim())
export const fmt$       = (n) => `$${parseFloat(n || 0).toFixed(2)}`
export const fmtDate    = (d) => new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
export const fmtTime    = (d) => new Date(d).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })

// Strips every non-digit, not just the first — `/\D/` without the global
// flag left pasted separators like "1234-5678" partially intact.
export const digitsOnly = (v, max) => v.replace(/\D/g, '').slice(0, max)

// IRS mileage rate gas cost share (~$0.21/mile)
export const calcCostShare = (miles, seats) => {
  const gas = miles * 0.21
  return Math.max(1.5, gas / seats).toFixed(2)
}

/* Vehicle details live in driver_profiles, not profiles. PostgREST returns
   the embedded row as either an object or a single-element array depending
   on how it resolves the relationship, so accept both. */
export const vehicleOf = (profile) => {
  const dp = profile?.driver_profiles
  if (Array.isArray(dp)) return dp[0] || {}
  return dp || {}
}
