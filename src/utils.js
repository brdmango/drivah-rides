export const isUFEmail  = (e) => e.trim().toLowerCase().endsWith('@ufl.edu')
export const isValidUID = (u) => /^\d{8}$/.test(u.trim())
export const fmt$       = (n) => `$${parseFloat(n || 0).toFixed(2)}`
export const fmtDate    = (d) => new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
export const fmtTime    = (d) => new Date(d).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })

// IRS mileage rate gas cost share (~$0.21/mile)
export const calcCostShare = (miles, seats) => {
  const gas = miles * 0.21
  return Math.max(1.5, gas / seats).toFixed(2)
}

export async function hashUFID(ufid) {
  const salt   = import.meta.env.VITE_UFID_SALT || 'drivah-carpool-salt'
  const data   = new TextEncoder().encode(ufid + salt)
  const buffer = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(buffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
}
