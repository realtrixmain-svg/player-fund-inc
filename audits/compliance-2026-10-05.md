# Compliance audit (GDPR + POPIA) - Player Fund Inc
Date: 2026-10-05 (re-run of 2026-10-01). Tier: interactive (invitation-only portal, clickwrap at signup). Method: code grep and file read; live DB not checked.

## Inventory re-check
Unchanged vs 2026-10-01. Grep of html/js (excluding vendor): only `localStorage` `pf-terms-seen` (js/main.js:80-83); no `document.cookie`, no analytics, no Google Fonts/esm.sh/CDN requests. Third parties: Formspree, Supabase, Resend, Vercel. All disclosed in privacy.html and cookies.html.

## Findings
| ID | Sev | Evidence | Finding | Status |
|----|-----|----------|---------|--------|
| C10 | MEDIUM | privacy.html "Who we are" | Entity and registered address (Player Fund Inc., Delaware; 8 The Green, Dover, DE 19908) now filled. | CLOSED |
| C11a | MEDIUM | terms.html:120-123 | Governing law (State of Delaware) filled. | CLOSED |
| C11b | MEDIUM | terms.html:112 | `[LIABILITY CAP AMOUNT/FORMULA]` still placeholder. | OPEN (Trevor/attorney, blocks push) |
| C15 | HIGH | privacy.html "International transfers" | US-established controller; policy only said providers "may" process abroad. | FIXED: states the controller is US-established and EU/UK/SA data is transferred to and processed in the US (SCC / POPIA s72 wording retained) |
| C16 | MEDIUM | privacy.html "Who we are" | POPIA uses "responsible party". | FIXED: controller "and, under POPIA, the responsible party" |
| C17 | MEDIUM | privacy.html | GDPR Art 27: a non-EU controller targeting EU/UK investors may need an EU/UK representative. Cannot be invented. | OPEN (Trevor/attorney: decide whether Art 3(2) applies; if so appoint rep and add name/address to policy) |
| C18 | INFO | privacy.html Rights | CCPA/CPRA: not a likely "business" at thresholds, policy already covers rights, no sale/share, 45-day response. | NO ACTION |
| C19 | MEDIUM | privacy/terms dates, sitemap | Dates stale after edits. | FIXED: 2026-10-05 |
| C12 | MEDIUM | DB | Live `pg_policies` vs supabase/schema.sql. | NOT CHECKED |
| C13 | MEDIUM | privacy.html | Supabase region, DPAs/SCCs (Supabase, Resend, Formspree, Vercel). | OPEN (Trevor) |
| C14 | LOW | schema | No automated retention job. | OPEN (process) |
| - | HIGH | portal | Information Officer designation/registration (POPIA). | OPEN (Trevor) |
| - | MEDIUM | DB | Migration (profiles.terms_accepted_at, terms_version) must precede function deploy. | OPEN (Trevor) |

Prior C1-C9 remain fixed (re-verified by grep above). Cookie banner not needed: only essential storage.

Statute-grounded checklist audit, not legal advice. Attorney review recommended for financial advisory before launch.
