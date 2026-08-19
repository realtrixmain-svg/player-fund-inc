# Player Fund Inc - SEO Audit Report

Run date: 2026-08-19 (`/claude-seo:seo` full audit — technical, content/E-E-A-T, schema, sitemap, GEO/AI-search, SXO)

---

## Critical finding: canonical/sitemap/OG pointed at a parked domain

Every `canonical`, `og:url`, `og:image`, `twitter:image` tag, `sitemap.xml` `<loc>`, and the
`Sitemap:` line in `robots.txt` pointed at `https://player-fund.com/` (no `www`) — but that apex
domain doesn't serve this site. It resolves to GoDaddy parking/traffic-arbitrage infrastructure
(`Server: openresty`, `lander_type=parkweb` cookies, a client-side JS bounce to `/lander`). The real
site only serves at `https://www.player-fund.com/`.

**Fixed in code**: every `canonical`/OG/Twitter/sitemap/robots.txt reference now points to
`https://www.player-fund.com/...`, matching what's actually live.

**Not code-fixable — needs Trevor**: the apex `player-fund.com` DNS/domain settings need to point at
Vercel (or 301 to `www`) at the registrar/DNS level. Until that's done, anyone who types the bare
domain (no `www`) lands on a parking page instead of the real site.

## Critical finding: the brand doesn't appear in its own search results

Google/LinkedIn/Crunchbase results for "Player Fund Inc" and "player-fund.com" are dominated by an
unrelated company, **"The Players Fund"** (playersfund.vc, a London athlete-led VC firm). Player
Fund Inc has no Google Business Profile, LinkedIn company page, or press coverage to out-rank the
namespace collision with. A referred prospect trying to verify the firm before a first call
currently cannot find it. This is an off-site/business task (GBP, LinkedIn, press/directory
mentions), not a code fix — flagging for Trevor.

## Critical finding: E-E-A-T / compliance gaps (YMYL site)

No named advisors or credentials anywhere on the site, no regulatory disclosure (SEC/FINRA/CRD/ADV
or any named regulator/jurisdiction), and an unsubstantiated "Consistent outperformance" H1 on the
About page with no supporting data. These require real business input only Trevor has — not
something to fabricate. Also flagged: the site had no Privacy Policy, Terms of Service, Cookie
Policy, or Accessibility Statement at all.

**Fixed in code**: added `privacy.html`, `terms.html`, `cookies.html`, `accessibility.html` (via the
`legal-compliance` skill), linked from every page's footer and from both the contact form and portal
signup page. Placeholders (`[LEGAL ENTITY NAME]`, `[REGISTERED ADDRESS]`, `[GOVERNING LAW
JURISDICTION]`, `[LIABILITY CAP AMOUNT/FORMULA]`) are left visibly marked for Trevor to fill in —
not attorney-reviewed, flagged in terms.html given the regulated vertical.

**Not fixed** (needs real business facts, not a code change): named advisor bios, regulatory
registration details, and whether/how to substantiate or reword the "outperformance" claim.

## High-priority findings — fixed in code

- **Security headers**: added CSP, `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`,
  `Permissions-Policy` via `vercel.json`.
- **Hero LCP weight**: `hero-poster.jpg` (207KB) → `hero-poster.webp` (146KB, resized), added
  `fetchpriority="high"` + `<link rel=preload>` on it, `preload="metadata"` on the video element.
- **Schema**: `FinancialService` JSON-LD was homepage-only and minimal. Added matching blocks to
  `about.html`/`contact.html`, and added `sameAs` (Twitter) + `email` to all three. Did not fabricate
  `address`/`telephone`/`founder` — none of that data exists yet.
- **llms.txt**: added at site root.
- **Sitemap**: added `<lastmod>` to every URL, added the four new legal pages.
- **CLS risk**: added explicit `width`/`height` to the two images (`bank-columns.webp`,
  `angular-building.webp`) that were missing them.

## Findings flagged, not fixed (need Trevor's input or are out of code scope)

- Apex domain DNS/parking (see above)
- Independent brand digital footprint: GBP, LinkedIn company page, YouTube, press mentions (see above)
- Named advisor/team page, regulatory disclosure, "outperformance" claim substantiation (see above)
- Content depth: homepage (356 words) and About (644 words) are thin for their topical weight; the
  "Responsible ownership"/"Effective monitoring" blocks are near-duplicated between home and about
- No question-framed headings/FAQ content for AI-citation readiness
- The About page's mid-content link into the login-gated portal, shown to non-clients with no
  explanation of what's behind it (SXO finding)
- IndexNow not implemented (low priority, optional protocol)

---

# 2026-08-17 run (prior)

## Title Tags and Meta Descriptions

### PASS: Title tags present and unique per page
- **index.html** (line 6): "Player Fund Inc - Best of Breed Investment Management" (57 characters) — clear, descriptive, keyword-rich
- **about.html** (line 6): "About - Player Fund Inc" (23 characters) — concise, page-specific
- **contact.html** (line 6): "Contact - Player Fund Inc" (24 characters) — concise, page-specific

All titles are within optimal range (50-60 characters for homepage, shorter for subpages acceptable).

### WARN: Meta description on index.html exceeds optimal length
- **index.html** (line 7): "Player Fund Inc is an advisory practice for entrepreneurs, families, companies and institutional clients, combining the classic values of an advisory firm with broadly-based financial expertise." (195 characters)
  - **Finding**: Exceeds recommended range (150-160 characters). Will be truncated in search results.
  - **Recommendation**: Shorten to ~155 characters. Example: "Player Fund Inc advises entrepreneurs, families, companies and institutions with best-of-breed investment management and cross-asset expertise."
  - **Status**: Logged, not applied (user copy, off-limits per audit rules)

### PASS: Meta descriptions on other pages appropriate
- **about.html** (line 7): "Our story, values, philosophy, approach, investment process and governance model at Player Fund Inc." (103 characters)
- **contact.html** (line 7): "Get in touch with Player Fund Inc to discuss an investment mandate." (67 characters)

(See prior version of this file in git history for the full 2026-08-17 report.)
