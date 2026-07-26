import { createClient } from '@supabase/supabase-js'
import { demoClient } from './demoClient.js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY

/* With no credentials the app runs against an in-memory demo backend
   instead of white-screening. Set both env vars for real data. */
export const isDemo = !supabaseUrl || !supabaseKey

if (isDemo) {
  console.warn(
    'DRIVAH is running in demo mode — data is in-memory and resets on reload.\n' +
    'Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env to connect Supabase.'
  )
}

export const supabase = isDemo
  ? demoClient
  : createClient(supabaseUrl, supabaseKey, {
      auth: { autoRefreshToken: true, persistSession: true },
    })
