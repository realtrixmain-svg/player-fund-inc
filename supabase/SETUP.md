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

## 7. Google Drive document sync (functions/drive-sync)

Implements Option B from `docs/google-drive-sync.md`: pulls files from a Drive folder per site into
the same `documents` bucket/table a manual upload would use, so RLS keeps working unchanged.

1. **Google Cloud service account.** Console → IAM & Admin → Service Accounts → Create. Enable the
   Drive API for the project. Create a JSON key for the account.
2. **Share the Drive folders.** Create one subfolder per site (`player-fund`, `hamilton-pe`,
   `hamilton-portfolio`) under a shared Drive folder, and share each with the service account's
   email (Viewer) — service accounts have no Drive storage of their own, they only see what's
   shared with them.
3. **Deploy the function:**
   ```
   supabase functions deploy drive-sync --no-verify-jwt
   ```
4. **Set secrets** (Project Settings → Edge Functions → Secrets, or `supabase secrets set`):
   - `GOOGLE_SERVICE_ACCOUNT_KEY` — the full JSON key file contents, as one string
   - `DRIVE_FOLDER_PLAYER_FUND`, `DRIVE_FOLDER_HAMILTON_PE`, `DRIVE_FOLDER_HAMILTON_PORTFOLIO` —
     each site's subfolder ID (from its Drive URL)
   - `SYNC_SECRET` — any random string; the function checks this on every request instead of
     relying on Supabase JWT auth, since it's meant to be called by a cron job, not a browser
5. **Schedule it** — nightly via `pg_cron` (SQL editor):
   ```sql
   select cron.schedule(
     'drive-sync-nightly',
     '0 3 * * *',
     $$ select net.http_post(
       url := '<SUPABASE_URL>/functions/v1/drive-sync',
       headers := jsonb_build_object('x-sync-secret', '<SYNC_SECRET>')
     ) $$
   );
   ```
   or trigger on demand with the same header from an internal admin page/`curl`.

Until this is deployed, keep uploading documents manually per step 4 above — this function is
additive, it doesn't replace that path.
