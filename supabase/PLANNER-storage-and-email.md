# Storage capacity + email verification — planning doc

## Supabase free plan limits (current, as of this write-up)

- **File storage:** 1 GB included, then $0.0213/GB on Pro
- **Database:** 500 MB (not the bottleneck here — a few thousand rows in `documents`/`profiles` is nothing)
- **Bandwidth:** 5 GB egress + 5 GB cached egress/month
- **50,000 MAU** included
- Free projects **pause after 1 week of inactivity** and are capped at **2 active projects** per account

### How many documents does that actually mean

The 6 seed PDFs already uploaded total **~23.6 MB**, averaging **~3.9 MB/file**. At that average:

- **1 GB free tier ≈ 260 documents** before storage fills up
- Pro plan's 100 GB ≈ 26,000 documents at the same average

Important caveat: the `documents` table right now is **flat/shared** — every signed-in client sees the same document list (see `schema.sql`). So that ~260-document ceiling is the total across the whole portal, not per-client. If documents stay as shared templates/disclosures (like the current 6), 260 is plenty for years. If this becomes "each client gets their own personalized statements/reports," the real capacity is 260 ÷ number of clients, which gets tight fast — that's the point to migrate to Google Drive-backed storage (see README's upgrade-path note) or a paid tier, whichever fits the volume once it's real.

## Email verification: your options

**Current state:** Auth is configured for Supabase's built-in shared email service. This is **only good for testing** — it caps at 2 emails/hour, and (per Supabase's own docs) that shared service will only actually deliver to addresses tied to your Supabase org's team members. A real client signing up right now would not receive a verification email at all. This needs to change before any real client uses the portal.

### Option A — Custom SMTP via a transactional email provider (recommended)
Point Supabase's Auth email at a real provider instead of the shared default.

| Provider | Free tier | Notes |
|---|---|---|
| Resend | 3,000 emails/month, 100/day | Simplest setup, modern API, good deliverability out of the box |
| Postmark | 100 emails/month free trial, then paid | Excellent deliverability reputation, geared toward transactional-only |
| SendGrid | 100 emails/day free | Well established, more setup overhead |
| Brevo | 300 emails/day free | Also handles marketing email if that's ever needed |

Setup: Authentication → Settings → SMTP Settings in the Supabase dashboard, plug in host/port/username/password/from-address from whichever provider. Takes ~10 minutes once an account is picked. After enabling custom SMTP, Supabase's own rate limit relaxes to 30/hour by default (adjustable).

Also worth doing at the same time (all in Supabase's own recommendations): SPF/DKIM/DMARC records on the sending domain, and a custom domain for the auth email links instead of the raw `*.supabase.co` one, so verification emails don't look like phishing.

### Option B — Stay on Supabase's shared service
Only viable for continued internal testing, not for real clients — 2 emails/hour and won't deliver to non-team-member addresses at all. No action needed if the portal isn't opening to real clients yet, but this **must** move to Option A before that happens.

### Option C — Skip email verification, use magic links / OTP instead
Supabase supports passwordless sign-in (magic link emailed, or OTP code). This sidesteps the "verify then password-login" two-step, since the act of clicking the link/entering the code IS the verification. Would mean dropping the password field entirely and reworking `portal-auth.js` to request a magic link. Bigger change than Option A, not necessary unless there's a reason to avoid passwords — mentioning it since it's Supabase's other supported path, not because it's the recommended move here.

**Recommendation:** Option A with Resend (simplest of the three paid-capable providers, generous free tier) once this is ready for real clients. Until then, Option B (current shared service) is fine to leave as-is for testing.
