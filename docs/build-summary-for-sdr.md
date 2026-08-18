# Client portal — plain-language summary

For anyone (SDR, sales, ops) who needs to explain what's been built and
where things stand, without needing to read code.

## What this is

A private client portal — login, sign up, view your documents — shared
across three related sites: **Player Fund Inc**, **Hamilton Portfolio**, and
**Hamilton Private Equity**. One client account system and one document
store sits behind all three, rather than building three separate logins.

A client goes to any of the three sites, clicks **Client Portal**, signs up
or signs in, and sees their own documents (fund disclosures, agreements,
statements — PDFs uploaded by the team) on a private dashboard. Nobody else
can see them.

## How sign-up and login work

- **Sign in**: straightforward email + password, same as any normal login.
- **Sign up**: this is the part that got rebuilt. When someone creates an
  account, the system has to decide which of the three sites they belong to
  — otherwise a Hamilton Portfolio client could accidentally end up seeing
  Player Fund's documents, or vice versa. That decision is now made by the
  server (whichever site's signup page they used), not by anything the
  person's browser sends — closing a hole where that assignment used to be
  trusted from the browser and could, in principle, have been forged.
- **Email verification**: after signing up, the person gets a confirmation
  email (sent via **Resend**, a third-party email service, not Supabase's
  own mailer) with a link. Clicking it takes them to a "you're verified,
  sign in now" page on the site they signed up on.

## Where the data lives

Everything runs on **Supabase** — one shared database and file storage
system used by all three sites. Two things matter here:
1. **Accounts and profiles** — who's signed up, and which of the three
   sites they belong to.
2. **Documents** — the actual files, stored privately, with rules baked
   into the database itself that only let a client see documents tagged for
   their own site (or let an admin see everything, for support).

Those access rules live in the database, not in the website code — so even
if someone tried to query the data directly, the same restrictions apply.

## What's been fixed / hardened recently

- The tenant-assignment issue described above (client accounts could
  previously claim to belong to any of the three sites) — closed.
- Two internal database functions that didn't need to be publicly callable
  — locked down.
- Verification emails now go through Resend instead of Supabase's built-in
  mailer, from one verified sending domain shared across all three sites.
- Hamilton Portfolio's portal (login/signup/dashboard) was fully built but
  had never actually been deployed — it's live now.

## What's still open

- Supabase's "leaked password protection" setting (blocks known-compromised
  passwords at signup) is off — a one-click toggle in the Supabase
  dashboard, not yet flipped on.
- Google Drive document sync (auto-pulling files from a Drive folder
  instead of uploading manually) is designed but not built — see
  `docs/google-drive-sync.md` for how that would work.

## One-line version

Three sites, one shared private portal, one account system, documents kept
strictly separated per site, verification emails handled by a third party —
built and live; a couple of small housekeeping items remain.
