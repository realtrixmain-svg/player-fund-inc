# Player Fund - master tracker
Updated: 2026-10-05

## Domain
Status: UNKNOWN (www.player-fund.com canonical in code; apex was a GoDaddy parking page per .player-fund-tracker.md, not re-checked)
URL: https://www.player-fund.com/   Checked: not checked this session

## Open for Trevor (blocks push)
Read this FIRST at the start of every session in this repo and remind Trevor. No push while any item is open.
- [x] Entity (Player Fund Inc., Delaware), registered address (8 The Green, Dover, DE 19908) filled 2026-10-05; governing law is England and Wales (UK law, per Trevor; corrected from Delaware, which was a misread)
- [x] Liability cap placeholder removed 2026-10-05 (Trevor: client unresponsive); terms now say liability is limited to the extent permitted by law, no figure. Attorney to add a cap if wanted.
- [ ] Apply the DB migration (profiles.terms_accepted_at, terms_version; in supabase/schema.sql) BEFORE deploying `signup-player-fund`, `signup-hamilton-pe`, `signup-hamilton-portfolio` (they now write those columns and reject signups without `terms_accepted`). Pushing the site first breaks nothing only if the functions are not yet redeployed; the new signup page sends the fields either way.
- [ ] Diff live `pg_policies` against supabase/schema.sql (not checked, no Supabase MCP this run)
- [ ] Information Officer named as Mohammed Miah in privacy.html 2026-10-05 (contact details "available on request"); confirm registration with the Information Regulator and add contact details when known
- [ ] Confirm Supabase project region and that DPAs/SCCs exist for Supabase, Resend, Formspree, Vercel
- [ ] Decide GDPR Art 27 EU/UK representative: needed if the fund targets EU/UK investors from the US with no EU establishment (attorney call; policy cannot name one until appointed)
- [ ] Attorney review of terms/privacy (financial advisory)

## Compliance (GDPR + POPIA)
Tier: interactive    Consent mechanism: clickwrap checkbox at portal signup (logged); no cookie banner, only essential local storage
Last: 2026-10-05 re-run, 0 blocker / 0 high open in code. Entity/address/governing law filled; policy now states US establishment, POPIA responsible party. Open: liability cap, Art 27 decision, items above.
Open for Trevor: see list above.
Full audit: audits/compliance-2026-10-05.md

## Security
Last: not run this session.

## SEO
Last: see SEO-LOG.md (not rerun this session).
