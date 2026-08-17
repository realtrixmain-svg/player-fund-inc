# Player Fund client portal — Supabase setup

I don't have Supabase account access, so the project itself has to be created by hand. Everything
below is copy/paste once you're in the dashboard.

## 1. Create the project

1. https://supabase.com/dashboard → New project. Any region.
2. Authentication → Providers → Email: leave **Confirm email = ON** (default). This is what
   forces email verification before a client can log in.
3. Authentication → URL Configuration → Site URL: your production domain
   (`https://player-fund.com` once live, or `http://localhost:PORT` while testing locally).

## 2. Schema

SQL editor → paste and run `supabase/schema.sql` (same folder as this file). Creates:
- `profiles` (name, admin flag) — one row per user, auto-created on signup via trigger
- `documents` (title, description, storage path) — the list the dashboard reads
- RLS: clients can read their own profile + the full document list; only `is_admin = true`
  profiles can write documents or upload/delete files
- the private `documents` storage bucket + matching storage policies

## 3. Get the API keys

Project Settings → API → copy the **Project URL** and **anon public** key into
`portal/config.js` (placeholders are already there). The anon key is safe to expose in
client-side code — RLS is what actually gates access, not key secrecy.

## 4. Upload the test documents

The 6 PDFs Trevor supplied are in `supabase/seed-documents/` (gitignored — real client docs,
not meant to live in the repo). Storage → `documents` bucket → upload them, then for each one
add a row in `documents` (Table editor → documents → Insert row) with matching `title` and
`storage_path` (the path shown in Storage, e.g. `PlayerFundInc - Guide to Fund Investing.pdf`).

## 5. Create the persistent admin/test account

Authentication → Users → Add user:
- Email: `ryantrevor72@gmail.com`
- Password: `trevor`
- **Auto Confirm User: ON** (this is the one account allowed to skip email verification, since
  it's for testing — every real client still has to verify)

Then in Table editor → `profiles`, find the row that got auto-created for that user (by the
trigger) and set `is_admin = true`.

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
