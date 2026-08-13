# Local Business Hub

A booking + business-website SaaS MVP for local service businesses (barbers,
salons, gyms, cafés, trades). Built with Next.js 14 (App Router), TypeScript,
Tailwind CSS and Supabase (Postgres + Auth + Row Level Security).

## What's implemented and functional

- **Auth** — email/password sign up, log in, log out, forgot-password (Supabase Auth), protected routes via middleware.
- **Onboarding** — creates a `businesses` row, generates a unique slug, and stores a validated per-business IANA timezone.
- **Business dashboard** (`/dashboard`) — real counts pulled from Postgres using the business timezone for local-day boundaries and appointment display.
- **Services** (`/dashboard/services`) — create / edit / delete / activate / deactivate, backed by Supabase.
- **Business settings** (`/dashboard/settings`) — business profile, IANA timezone, and opening hours.
- **Public business page** (`/b/[slug]`) — real data: name, description, address, phone, email, timezone, hours, active services.
- **Booking system** — 3-step widget (service → date/time → details) on the public page. Available slots are computed in the business timezone from opening hours minus already-booked ranges. A Postgres **exclusion constraint** (`no_overlapping_appointments`) blocks double-booking at the database level, and the database trigger also enforces the business-local opening-hours window.
- **Appointment management** (`/dashboard/appointments`) — confirm / cancel / mark completed, filterable, with times displayed in the business timezone.
- **Analytics** — `page_views` table records `page_view`, `booking_attempt`, `booking_completed` events; the dashboard reads real counts (no mock numbers).
- **RLS** — every table has Row Level Security enabled; owners only see their own business's private data, public pages only expose intended fields.
- **Responsive** — mobile top nav + tab bar on the dashboard, desktop sidebar; booking widget and public page adapt down to phone width.

---

## Password reset / recovery email configuration

The password-reset flow uses Supabase's PKCE flow, but the recovery email must **not** contain the default `{{ .ConfirmationURL }}` as its clickable link. That URL performs the one-time verification on `GET`, which can be consumed by Gmail/Outlook/security scanners before the user clicks it and produces `otp_expired`.

The repository contains the scanner-safe template at [`supabase/templates/recovery.html`](./supabase/templates/recovery.html). It sends the `{{ .TokenHash }}` to the app's `/auth/callback` route without verifying it. The callback then displays `/auth/confirm`, and only the user's explicit POST action calls `verifyOtp`.

### Hosted Supabase production configuration

Supabase hosted projects do not read the repository template automatically. In **Supabase → Authentication → Email Templates → Reset Password**, replace the production recovery email HTML with the contents of `supabase/templates/recovery.html`.

Keep these Redirect URLs configured:

- `https://local-business-hub-ashen.vercel.app/auth/callback`
- `http://localhost:3000/auth/callback`
- `https://local-business-hub-ashen.vercel.app/update-password`

The application sends password-reset requests to `/auth/callback?next=/update-password`, so the existing callback allow-list entries remain sufficient.

If an email provider performs link tracking, disable tracking for the recovery email as well; otherwise the provider can rewrite or prefetch the authentication URL.

---

## 1. Setup

### 1a. Create a Supabase project
Go to [supabase.com](https://supabase.com) → New project.

### 1b. Run the schema
Open the SQL Editor in your Supabase project and run the full contents of
[`supabase/schema.sql`](./supabase/schema.sql). This creates all tables,
indexes, the anti-double-booking constraint, RLS policies, timezone-aware
appointment validation, and a trigger that auto-creates a `profiles` row on signup.

### 1c. Get your API keys
In Supabase → Project Settings → API, copy the **Project URL** and **anon public key**.

### 1d. Environment variables
```bash
cp .env.example .env.local
```
Fill in:
```
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```
(`SUPABASE_SERVICE_ROLE_KEY` is used only by the server-side account-deletion action and must remain secret.)

### 1e. Install and run
```bash
npm install
npm run dev
```
Visit `http://localhost:3000`.

### 1f. Create your demo business ("Blade Barber")
Sign up through the UI (`/signup`), complete onboarding with:
- Name: `Blade Barber`
- Type: `Barber shop`
- Timezone: `Asia/Baku` (or the business's actual IANA timezone)
- Then add the three services from your dashboard:
  - Haircut — €20 — 30 min
  - Beard Trim — €12 — 20 min
  - Haircut + Beard — €28 — 45 min

(The commented-out `INSERT` block at the bottom of `schema.sql` does the same
thing directly in SQL if you'd rather seed it than click through the UI —
just replace `<OWNER_UUID>` with your new user's id from the `auth.users`
table first.)

---

## 2. Deploying to Vercel

1. Push this repo to GitHub.
2. In Vercel: **New Project** → import the repo.
3. Add the same environment variables from `.env.local` under **Settings → Environment Variables** (set `NEXT_PUBLIC_SITE_URL` to your production URL, e.g. `https://your-app.vercel.app`).
4. Deploy. Vercel auto-detects Next.js — no build config needed.
5. In Supabase → Authentication → URL Configuration, add your Vercel URL to **Site URL** and **Redirect URLs** (needed for password-reset links to work in production).

---

## 3. Before accepting real paying customers

This is a functional MVP, not a launch-ready product. Before charging real
customers, you'd still need:

1. **Stripe billing** — checkout for Pro/Business plans, webhook handling to update `businesses.plan`, and gating features (e.g. service limits) by plan.
2. **Email notifications** — bookings are stored with `status = 'pending'`; no confirmation emails are sent yet (see "Before accepting real customers" below).
3. **Abuse protection on the public booking form** — rate limiting and a CAPTCHA/bot check, since it currently accepts anonymous inserts by design.
4. **Logo/photo upload** — wire up Supabase Storage for `logo_url`.
5. **Multi-staff / multi-location** — the model is one business per owner.
6. **Generated DB types** — replace the loosely-typed `supabase-js` calls with types generated via `supabase gen types typescript`, for compile-time safety on every query.
7. **Monitoring & error tracking** (e.g. Sentry) and structured logging for the server actions.
8. **Automated integration tests** — timezone unit coverage now exists under `tests/timezone.test.ts`; booking-concurrency and RLS integration tests still need to be run against a real Supabase environment.
9. **Legal/compliance basics** — terms of service, privacy policy, cookie notice.
10. **A production `npm run build` pass in a networked environment** — this project was built in a sandboxed environment without registry access; dependencies may not be installed here.
