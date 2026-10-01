# Player Fund - master tracker
Updated: 2026-10-01

## Domain
Status: UNKNOWN (www.player-fund.com canonical in code; apex was a GoDaddy parking page per .player-fund-tracker.md, not re-checked)
URL: https://www.player-fund.com/   Checked: not checked this session

## Open for Trevor (blocks push)
Read this FIRST at the start of every session in this repo and remind Trevor. No push while any item is open.
- [ ] `[LEGAL ENTITY NAME]` and `[REGISTERED ADDRESS]` in privacy.html
- [ ] `[GOVERNING LAW JURISDICTION]` and `[LIABILITY CAP AMOUNT/FORMULA]` in terms.html
- [ ] Apply the DB migration (profiles.terms_accepted_at, terms_version; in supabase/schema.sql) BEFORE deploying `signup-player-fund`, `signup-hamilton-pe`, `signup-hamilton-portfolio` (they now write those columns and reject signups without `terms_accepted`). Pushing the site first breaks nothing only if the functions are not yet redeployed; the new signup page sends the fields either way.
- [ ] Diff live `pg_policies` against supabase/schema.sql (not checked, no Supabase MCP this run)
- [ ] Designate and register an Information Officer with the Information Regulator (POPIA); policy points requests to investors@player-fund.com
- [ ] Confirm Supabase project region and that DPAs/SCCs exist for Supabase, Resend, Formspree, Vercel
- [ ] Attorney review of terms/privacy (financial advisory)

## Compliance (GDPR + POPIA)
Tier: interactive    Consent mechanism: clickwrap checkbox at portal signup (logged); no cookie banner, only essential local storage
Last: 2026-10-01, 0 blocker / 0 high open in code. Self-hosted fonts + gsap + supabase-js, CSP tightened, policies synced, POPIA content added.
Open for Trevor: see list above.
Full audit: audits/compliance-2026-10-01.md

## Security
Last: not run this session.

## SEO
Last: see SEO-LOG.md (not rerun this session).
