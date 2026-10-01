# Compliance audit (GDPR + POPIA) - Player Fund Inc
Date: 2026-10-01. Tier: interactive (invitation-only portal with signup/login/uploads). Method: code grep and file read only; live DB not checked.

## Inventory (what the build really does)
- Cookies: none set by our code (`document.cookie` absent).
- localStorage: `pf-terms-seen` (js/main.js:80-83, public pages); Supabase auth session `sb-<ref>-auth-token` (portal, supabase-js default).
- sessionStorage/indexedDB/service workers: none.
- Third parties at runtime: Formspree (contact form, contact.html), Supabase (auth, DB, storage, edge functions), Resend (signup confirm, password reset, admin sign-in code), Vercel (hosting). Before this audit also Google Fonts and esm.sh (gsap, supabase-js).
- Personal data: contact form (name, email, company, message); profiles (full_name, site, is_admin); auth.users (email, password hash); access_codes (code, optional email, label, redeemed_by/at); documents + storage buckets (client documents); admin_login_codes (hashed, 10 min), admin_sessions (12 h). Drive-sync function exists but is not live.
- RLS enabled on all public tables; policies per supabase/schema.sql.

## Findings
| ID | Sev | Evidence | Finding | Status |
|----|-----|----------|---------|--------|
| C1 | BLOCKER | cookies.html summary, privacy.html "What we collect" | Policy said the public site stores nothing; `pf-terms-seen` localStorage flag exists (js/main.js:80). Policy contradicts build. | FIXED: disclosed in cookies.html (table + text) and privacy.html |
| C2 | BLOCKER | all 19 html pages (fonts.googleapis.com), js/parallax.js, portal/supabase-client.js (esm.sh), vercel.json CSP | Third-party requests (Google Fonts, esm.sh CDN) leak visitor IP to Google/esm.sh, undisclosed; policy claimed no third-party trackers. | FIXED: fonts self-hosted (assets/fonts, css/fonts.css), gsap and supabase-js bundled to js/vendor/, CSP tightened to `'self'` plus Formspree and Supabase |
| C3 | BLOCKER | portal/signup.html:64 (old) | Interactive tier needs clickwrap; only browsewrap text existed, no record. | FIXED: unticked required checkbox, JS guard, edge function rejects without `terms_accepted`, writes `profiles.terms_accepted_at` + `terms_version`. Needs DB migration + function deploy (see Open) |
| C4 | HIGH | privacy.html | Missing disclosure of: access codes, consent record, documents, admin sign-in codes/sessions, device storage, Vercel by name, Resend purposes (reset, admin code). | FIXED |
| C5 | HIGH | privacy.html Rights/Transfers | No POPIA content: s72 cross-border, POPIA data subject rights, Information Regulator complaint route, Information Officer contact. | FIXED (generic wording; IO designation open) |
| C6 | HIGH | privacy.html Security | Claimed documents visible "to that client alone"; admins can read all sites. | FIXED |
| C7 | MEDIUM | privacy.html Children | "under 13" while terms require 18 for portal; POPIA minors are under 18. | FIXED |
| C8 | MEDIUM | privacy/terms/cookies.html | Dates stale, em dash entities used as separators. | FIXED: dated 2026-10-01, sitemap lastmod updated, dashes replaced with hyphens |
| C9 | MEDIUM | cookie banner | No banner. Not added: nothing non-essential is stored, so a banner would have no choice to offer. Revisit if analytics/embeds are ever added. | DECISION RECORDED |
| C10 | MEDIUM | privacy.html, entity | `[LEGAL ENTITY NAME]`, `[REGISTERED ADDRESS]` not found anywhere in repo. | OPEN (Trevor) |
| C11 | MEDIUM | terms.html | `[GOVERNING LAW JURISDICTION]`, `[LIABILITY CAP AMOUNT/FORMULA]` need Trevor/attorney. | OPEN (Trevor) |
| C12 | MEDIUM | DB | Live `pg_policies` vs supabase/schema.sql NOT checked (no Supabase MCP in this session). Prior drift was found on 2026-08-30. | NOT CHECKED |
| C13 | MEDIUM | privacy.html | Supabase region, Resend/Formspree DPAs and SCC status not verifiable from repo; policy states generic SCC reliance. Supabase pooler host `aws-1-eu-west-3` suggests Paris. | OPEN (Trevor to confirm) |
| C14 | LOW | schema | No automated retention/deletion job for contact data (Formspree inbox) or accounts; policy states deletion on request. | OPEN (process) |

## Policy vs reality after fixes
Every inventory item above appears in privacy.html or cookies.html. No tracking scripts load. Footer links to privacy/terms/cookies/accessibility on every page; contact form and signup link the policies.

Statute-grounded checklist audit, not legal advice. Attorney review recommended for financial advisory before launch.
