# 🚗 DRIVAH — Campus Carpool Network

The verified peer-to-peer carpool platform for UF students.
Split gas. Build community. Skip Uber.

---

## Quick Start

### 1. Install dependencies
```bash
npm install
```

### 2. Run it — no backend required

```bash
npm run dev
```

With no Supabase credentials configured the site boots into **demo mode**: an
in-memory backend seeded with sample trips, riders and bookings. Every screen —
rider, driver and admin — is fully browsable, and a banner marks the session as
demo. Sign in with any `@ufl.edu` email and any password; the admin PIN is `2580`.
Demo data resets on reload.

To connect a real backend, follow the steps below.

### 3. Set up Supabase
1. Go to [supabase.com](https://supabase.com) and create a free project
2. In the SQL Editor, paste and run the contents of `drivah-schema.sql`
3. Go to Settings → API and copy your Project URL and anon key

### 4. Configure environment
```bash
cp .env.example .env
```
Fill in your `.env`:
```
VITE_SUPABASE_URL=https://yourproject.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_UFID_SALT=any-random-secret-string
```

Restart the dev server and the app switches from demo mode to your live project.
Vite inlines env vars at build time, so a production build made without these
values ships in demo mode — set them in your host's dashboard before deploying.

Open [http://localhost:5173](http://localhost:5173)

---

## Project Structure

```
drivah/
├── src/
│   ├── App.jsx                  # Root auth controller
│   ├── supabase.js              # Supabase client (falls back to demo mode)
│   ├── demoClient.js            # In-memory backend used when unconfigured
│   ├── demoData.js              # Seed trips / profiles / bookings for demo mode
│   ├── theme.js                 # Design tokens + global CSS
│   ├── utils.js                 # Helper functions
│   ├── components/
│   │   ├── UI.jsx               # Shared components (Logo, Btn, Input, TripCard…)
│   │   └── PostTripModal.jsx    # Trip posting bottom sheet
│   └── screens/
│       ├── Auth.jsx             # RoleSelector, Login, Forgot, AdminPinGate
│       ├── Signup.jsx           # RiderSignup, DriverSignup
│       └── Apps.jsx             # RiderApp, DriverApp, AdminPlatform
├── drivah-schema.sql            # Full Supabase database schema
├── .env.example                 # Environment variable template
├── vercel.json                  # SPA rewrites + build config
├── index.html
├── vite.config.js
└── package.json
```

---

## How It Works

### For Riders 🎓
1. Sign up with your @ufl.edu email and UFID
2. Browse available trips posted by drivers
3. Search by origin or destination
4. Join a carpool — pay your share of gas costs
5. Track your rides and savings in your wallet

### For Drivers 🚗
1. Register with vehicle details
2. Post trips you're already planning to take
3. Set origin, destination, date/time, seats, and distance
4. The app auto-calculates a fair gas cost share (IRS rate)
5. Optional: mark trips as recurring weekly

### For Admins 🛡️
- Two-factor login (password + PIN)
- Platform stats dashboard
- Trip monitoring
- Settings management

---

## Key Features

- **@ufl.edu verification** — only real UF students
- **UFID hashing** — secure, never stored in plaintext
- **IRS mileage rate calculator** — auto-calculates fair gas splits
- **Recurring trips** — post once, riders join every week
- **Realtime notifications** — via Supabase realtime subscriptions
- **Detour toggle** — drivers can signal flexibility
- **Admin PIN gate** — two-factor admin security

---

## Deploy to Vercel

```bash
npm run build
```

Or connect your GitHub repo to Vercel and add your environment variables in the Vercel dashboard. Deploys automatically on every push.

---

## Admin Setup

After running the schema, create an admin user:
1. Go to Supabase → Authentication → Users → Add user
2. Use any email (doesn't need to be @ufl.edu)
3. Run in SQL Editor:
```sql
update public.profiles set role = 'admin' where email = 'your@email.com';
```
4. Default admin PIN is `2580` — change it in `src/screens/Auth.jsx`

---

## Expanding to Other Universities

The app currently validates `@ufl.edu` emails. To add other universities:

In `src/utils.js`, update `isUFEmail`:
```js
const ALLOWED_DOMAINS = ['ufl.edu', 'fsu.edu', 'ucf.edu']
export const isUFEmail = (e) =>
  ALLOWED_DOMAINS.some(d => e.trim().toLowerCase().endsWith(`@${d}`))
```

---

## Tech Stack

- **React 18** + Vite
- **Supabase** (Auth, Database, Realtime)
- **DM Sans** + **Syne** + **DM Mono** (Google Fonts)
- No other dependencies — intentionally lean

---

Built by Allan · DRIVAH Carpool Network · University of Florida
