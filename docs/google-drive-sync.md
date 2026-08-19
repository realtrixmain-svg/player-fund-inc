# Google Drive document sync — how it works

**Built.** Option B below is implemented as `supabase/functions/drive-sync`.
Deployment steps (service account, folder sharing, secrets, cron schedule)
are in `supabase/SETUP.md` §7 — it needs a Google Cloud service account key
that only Trevor can provision, so the function ships ready to deploy but
isn't live until that key and the Drive folder IDs are set as secrets.

## Where things stand today

Client documents live in one place: a private `documents` bucket in the
shared Supabase project, with a `documents` table row per file (title,
description, `storage_path`, `site`). Getting a file into a client's portal
today means manually uploading it to that bucket and inserting the matching
row — there's no Drive connection of any kind yet.

## The three ways to add Google Drive

### Option A — keep it manual
Do nothing. Skip Drive entirely, keep uploading through the Supabase
dashboard. Mentioned only so it's clear this is a real option, not a gap.

### Option B — scheduled sync (recommended)
A Google Cloud **service account** gets read access to a shared Drive
folder, with one subfolder per site (`/player-fund`, `/hamilton-pe`,
`/hamilton-portfolio`). A small Supabase Edge Function, running on a
schedule:

1. Lists files in each site's Drive subfolder via the Drive API.
2. Downloads anything new or changed (tracked by Drive's file ID, so re-runs
   don't create duplicates).
3. Uploads it into the existing `documents` storage bucket.
4. Upserts the matching `documents` table row, tagged with that subfolder's
   `site`.

Trigger it either on a nightly `pg_cron` schedule, or an on-demand "Sync now"
button on an internal admin page that calls the same function. The service
account's key is stored as a Supabase secret, same pattern as the Resend key.

Everything that already protects documents — the per-site RLS policies —
keeps working unchanged, because the sync just becomes another way rows get
into `documents`; it doesn't touch how clients read them.

Rough effort: one Edge Function plus the service-account/folder setup, once
it's clear which Drive folder maps to which site. About a day.

### Option C — link straight to Drive, no copy
Skip storage entirely: store the Drive file's shareable link/ID in the
`documents` table, and clients click through to Drive itself.

Not recommended. This makes Drive's own sharing settings the actual access
control instead of Supabase RLS — the exact class of "who can see whose
documents" problem that just got fixed for the portal (see
`docs/build-summary-for-sdr.md`). A single mis-set Drive permission
("anyone with the link") would undo that, and there'd be no way to catch it
from the Supabase side.

## Recommendation

Option B when the time comes. It's the only one that keeps document access
governed by the same RLS rules as everything else in the portal, and it's a
contained, one-function addition rather than a rework of how the portal
reads documents.
