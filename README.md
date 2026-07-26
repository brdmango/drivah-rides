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
```

Then set the UFID salt on the database — it is deliberately *not* a `VITE_`
variable, because anything prefixed that way is compiled into the JavaScript
bundle and readable by anyone:

```sql
alter database postgres set app.ufid_salt = 'some-long-random-string';
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
- **UFID hashing** — hashed in Postgres with a server-side salt, and the raw
  value is stripped from user metadata before it is ever stored
- **IRS mileage rate calculator** — auto-calculates fair gas splits
- **Atomic seat booking** — `join_trip` / `leave_trip` lock the trip row, so two
  riders cannot take the same last seat
- **Recurring trips** — post once, and each week's instance is rolled forward
- **Realtime notifications** — drivers are told when riders join or leave;
  riders are told when a trip is cancelled
- **Detour toggle** — drivers can signal flexibility
- **Admin PIN gate** — a second step in front of the admin dashboard

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

> **On the admin PIN:** it is checked in the browser, so treat it as a
> speed bump against a shoulder-surfer, not as access control. What actually
> protects admin data is the `is_admin()` RLS policy in the schema, which is
> enforced by Postgres regardless of what the client does.

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
