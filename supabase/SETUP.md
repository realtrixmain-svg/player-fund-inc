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
3. 🔴 **Authentication → Sign In / Providers → turn "Allow new users to sign up" OFF.** This is
   not optional and it is not a hardening nicety - it is what makes the access code mean anything.
   The anon key ships in `portal/config.js` (it is meant to be public; RLS is the gate), and
   Supabase's own `POST /auth/v1/signup` endpoint accepts that key from anyone. While that toggle
   is ON, a person can create an account with a single curl call and never touch the access-code
   form. With it OFF, `auth.admin.createUser` under the service-role key is the only way an
   account can be made, and that call lives exclusively inside the signup edge functions, which
   redeem a code first.

   The `site` default of `'unassigned'` in `schema.sql` is the second lock behind this one: an
   account created some other way can read nothing. Do not rely on it alone - it limits the blast
   radius, it does not stop the account being made.
4. Authentication → Policies → turn **Leaked password protection ON** (checks new passwords against
   HaveIBeenPwned). Off by default, and this portal holds client financial documents.
5. Authentication → URL Configuration → Site URL: your production domain
   (`https://player-fund.com` once live, or `http://localhost:PORT` while testing locally).

## 2. Schema

SQL editor → paste and run `supabase/schema.sql` (same folder as this file). Idempotent — same
file to run fresh or to re-run against the existing player-fund project to upgrade it. Creates:
- `profiles` (name, `site`, admin flag) — one row per user, auto-created on signup via trigger,
  tagged with whichever site (`player-fund` / `hamilton-pe` / `hamilton-portfolio`) they signed up on
- `documents` (title, description, storage path, `site`) — the list each portal's dashboard reads
- RLS: a client sees only documents tagged for their own `site`; an admin profile (`is_admin =
  true`, any site) sees and writes documents for all three
- `access_codes` — the invite list; no account can be created without a matching row (see step 4c)
- one private storage bucket per site (`documents-player-fund`, `documents-hamilton-pe`,
  `documents-hamilton-portfolio`) + policies, so a client can only read objects out of their own
  site's bucket and an admin can read and write all three

## 3. Get the API keys

Project Settings → API → copy the **Project URL** and **anon public** key into `portal/config.js`
in **all three** repos (player-fund, Hamilton-Private-Equity, hamilton portfolio — placeholders are
already there, one project shared by all three). Each repo's `config.js` also sets its own `SITE`
constant (`player-fund` / `hamilton-pe` / `hamilton-portfolio`) — that's what tags a signup and
scopes the document view to that site; don't need to touch it, just don't copy it wrong. The anon
key is safe to expose in client-side code — RLS is what actually gates access, not key secrecy.

## 4. Upload documents

Storage → the **`documents-<site>` bucket for that site** → upload the file, then add a row in
`documents` (Table editor → documents → Insert row) with matching `title`, `storage_path` (the path
shown in Storage), and the same `site`. The bucket is what actually gates the file; the `site`
column on the row is what decides whether it appears in the list. Both have to agree, or the
document shows up in the list and then fails to download. The 6 seed PDFs for player-fund are in
`supabase/seed-documents/` (gitignored — real client docs, not meant to live in the repo).

### 4b. The old shared bucket (done - kept as a duplicate)

Earlier uploads went into a single shared `documents` bucket. The portals now read from
`documents-<site>`, and all six player-fund PDFs have been copied across at identical paths, so the
`storage_path` values in the `documents` table resolve unchanged. Verified by signing in as an
ordinary player-fund client and downloading all six through the same signed-URL call the dashboard
makes - real PDF bytes, byte counts matching the originals.

The legacy `documents` bucket still holds its own copy of those six files (~24 MB of duplicate
storage). Nothing reads it any more. Delete it in Storage when you want the space back; leaving it
costs nothing but the megabytes, and it is the rollback if anything about the new buckets ever
turns out wrong.

### 4c. Issue an access code

Nobody can create an account without one. Table editor → `access_codes` → Insert row:

| column | what to put |
|---|---|
| `code` | whatever you're giving the person — their ID number, a pre-approved phone number, a generated string. Stored upper-cased and trimmed automatically, and matched case-insensitively at signup. |
| `site` | `player-fund` / `hamilton-pe` / `hamilton-portfolio`. **This is what decides which bucket's documents they will see** — not the page they sign up on. A `hamilton-portfolio` code entered on the Hamilton PE signup form is rejected. |
| `email` | optional. Set it to lock the code to one address; leave null to let them use any address. |
| `label` | optional, for you — who it was issued to. |
| `expires_at` | optional cut-off. |

Leave `redeemed_by` / `redeemed_at` empty. They are stamped automatically when the code is spent,
and a code is single-use: once `redeemed_at` is set, that code stops working. To re-issue one,
clear both columns back to null.

🔴 **If the code is something guessable — a phone number, an ID number — set `email` as well.**
The signup endpoint is public and has no rate limiting, so a guessable code on its own is a
guessable account. The email lock makes guessing the code insufficient.

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

## 5b. Deploy the signup functions

All three portals sign up through an edge function rather than calling `supabase.auth.signUp`
directly, so the access code is redeemed and `site` is assigned server-side with the service-role
key. `verify_jwt=false` because the caller is an anonymous visitor, not a signed-in user:

```
supabase functions deploy signup-player-fund --no-verify-jwt
supabase functions deploy signup-hamilton-pe --no-verify-jwt
supabase functions deploy signup-hamilton-portfolio --no-verify-jwt
```

Each of those files is only its own constants; the shared logic lives in `functions/_shared/signup.ts`
and is bundled automatically. Change the flow once, redeploy all three.

**Resend.** One Supabase project backs all three sites, so they share one Resend account and one
secret — nothing per-site to set up. Project Settings → Edge Functions → Secrets:

- `RESEND_SECRET_NAME` — the Resend API key (the name is literal; that's the env var the functions read)

Verification emails send from `noreply@hamiltonportfolio.com` for all three, since that's the domain
already verified in Resend; only the display name differs per site. If a new sending domain is ever
verified, change `fromEmail` in the three wrapper files and redeploy.

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
