# Client portal — Supabase setup (shared across player-fund / hamilton-pe / hamilton-portfolio)

One Supabase project backs all three portals. Every user signs up through whichever site's login
page they land on; a `site` column on `profiles` and `documents` scopes what a normal client sees
to their own site. One admin account (`is_admin = true`) bypasses that scoping and sees/manages
all three sites' documents — set `is_admin` once on the account below and it works everywhere.

I don't have Supabase account access, so the project itself has to be created by hand. Everything
below is copy/paste once you're in the dashboard.

## 1. Create the project

1. https://supabase.com/dashboard → New project. Any region.
2. Authentication → Providers → Email: leave **Confirm email = ON** (default). This is what
   forces email verification before a client can log in.
3. Authentication → URL Configuration → Site URL: your production domain
   (`https://player-fund.com` once live, or `http://localhost:PORT` while testing locally).

## 2. Schema

SQL editor → paste and run `supabase/schema.sql` (same folder as this file). Idempotent — same
file to run fresh or to re-run against the existing player-fund project to upgrade it. Creates:
- `profiles` (name, `site`, admin flag) — one row per user, auto-created on signup via trigger,
  tagged with whichever site (`player-fund` / `hamilton-pe` / `hamilton-portfolio`) they signed up on
- `documents` (title, description, storage path, `site`) — the list each portal's dashboard reads
- RLS: a client sees only documents tagged for their own `site`; an admin profile (`is_admin =
  true`, any site) sees and writes documents for all three
- the private `documents` storage bucket + matching storage policies (same site-scoped rule)

## 3. Get the API keys

Project Settings → API → copy the **Project URL** and **anon public** key into `portal/config.js`
in **all three** repos (player-fund, Hamilton-Private-Equity, hamilton portfolio — placeholders are
already there, one project shared by all three). Each repo's `config.js` also sets its own `SITE`
constant (`player-fund` / `hamilton-pe` / `hamilton-portfolio`) — that's what tags a signup and
scopes the document view to that site; don't need to touch it, just don't copy it wrong. The anon
key is safe to expose in client-side code — RLS is what actually gates access, not key secrecy.

## 4. Upload documents

Storage → `documents` bucket → upload the file, then add a row in `documents` (Table editor →
documents → Insert row) with matching `title`, `storage_path` (the path shown in Storage), and the
`site` it belongs to. The 6 seed PDFs for player-fund are in `supabase/seed-documents/` (gitignored
— real client docs, not meant to live in the repo).

## 5. Create the persistent admin account

Authentication → Users → Add user:
- Email: `ryantrevor72@gmail.com`
- Password: `trevor`
- **Auto Confirm User: ON** (this is the one account allowed to skip email verification, since
  it's for testing — every real client still has to verify)

Then in Table editor → `profiles`, find the row that got auto-created for that user (by the
trigger) and set `is_admin = true`. That one flag is what makes this account work as the admin
across all three sites — `site` on the admin's own profile row doesn't matter once `is_admin` is
true, since every RLS policy checks `is_admin` before it checks `site`.

🔴 **`trevor` is a placeholder password for local testing only.** Change it (Authentication →
Users → that user → reset password) before this goes anywhere near production, and turn off
Auto Confirm for any future admin accounts once real verification is wired up.

## 6. Later upgrade path

- Email delivery: Supabase's built-in email (via their shared SMTP) is rate-limited and fine for
  testing, not for production volume. Swap in Resend/Postmark/SendGrid under Authentication →
  Settings → SMTP Settings when going live — no code changes needed on the portal side.
- Google Drive-backed documents: current setup stores files directly in Supabase Storage
  (simplest path, and what was asked for as the fallback). If document volume/collaboration needs
  outgrow that, swap `portal/dashboard.html`'s fetch of `documents` rows for a Drive API call
  keyed by folder ID — the RLS-gated `documents` table can stay as the index either way.
