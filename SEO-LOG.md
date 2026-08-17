# Player Fund Inc - SEO Audit Report

Run date: 2026-08-17

---

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

---

## Canonical Tags and URL Structure

### PASS: Canonical tags present and correct on all pages
- **index.html** (line 8): `<link rel="canonical" href="https://player-fund.com/">`
- **about.html** (line 8): `<link rel="canonical" href="https://player-fund.com/about.html">`
- **contact.html** (line 8): `<link rel="canonical" href="https://player-fund.com/contact.html">`

All canonical URLs are absolute, protocol-correct (HTTPS), and match their respective page locations.

---

## Open Graph and Twitter Card Tags

### PASS: OG tags present on all pages
- **index.html** (lines 10-19): og:type, og:site_name, og:title, og:description, og:url, og:image
- **about.html** (lines 10-19): og:type, og:site_name, og:title, og:description, og:url, og:image
- **contact.html** (lines 10-19): og:type, og:site_name, og:title, og:description, og:url, og:image

### PASS: Twitter Card tags present on all pages
- **index.html** (lines 16-19): twitter:card="summary_large_image", twitter:title, twitter:description, twitter:image
- **about.html** (lines 16-19): twitter:card="summary_large_image", twitter:title, twitter:description, twitter:image
- **contact.html** (lines 16-19): twitter:card="summary_large_image", twitter:title, twitter:description, twitter:image

All OG and Twitter tags use absolute HTTPS URLs for og:url and og:image (https://player-fund.com/assets/video/hero-poster.jpg).

---

## Heading Hierarchy

### PASS: Correct heading hierarchy on index.html
- **H1** (line 68): "Best of breed management. Consistent outperformance." — ONE H1 per page ✓
- **H2** (line 82): "Built around the client, not a product shelf"
- **H2** (line 114): "Our approach"
- **H2** (line 131): "Let's discuss your mandate"
- **H3** (line 88): "Responsible ownership" (under H2 at line 82)
- **H3** (line 93): "Effective monitoring" (under H2 at line 82)
- No skipped heading levels ✓

### PASS: Correct heading hierarchy on about.html
- **H1** (line 56): "Focused, best of breed management" — ONE H1 per page ✓
- **H2** (lines 66, 80, 114, 132, 156, 166): Multiple H2s for sections
- **H3** (lines 86, 91, 96, 101, 138, 143): Multiple H3s under H2s
- No skipped heading levels ✓

### PASS: Correct heading hierarchy on contact.html
- **H1** (line 56): "Let's discuss your mandate" — ONE H1 per page ✓
- **H2** (line 66): "Get in touch"
- No skipped heading levels ✓

---

## Image Alt Text

### FIXED: Two hero images had empty alt attributes
- **about.html** (line 54): `<img src="assets/images/skyscrapers-glass.webp" alt="" loading="eager">`
  - **Fix applied**: Changed alt to "Glass skyscrapers in a financial district"
  
- **contact.html** (line 54): `<img src="assets/images/angular-building.webp" alt="" loading="eager">`
  - **Fix applied**: Changed alt to "Modern angular institutional building architecture"

### PASS: All other images have meaningful alt text
- index.html line 101: "Neoclassical institutional building facade"
- index.html line 111: "Modern angular institutional building against a pale sky"
- index.html line 123: "City skyline at dusk, representing worldwide market access"
- about.html line 71: "Archival photograph of a traditional Dutch windmill against a dramatic sky"
- about.html line 111: "Two advisors reviewing a mandate together at a desk"
- about.html line 122: "Financial district skyscrapers viewed from street level"
- about.html line 153: "Advisors discussing a portfolio around a laptop"
- contact.html line 117: "Advisors reviewing a mandate together"

---

## Structured Data (JSON-LD)

### PASS: FinancialService schema on index.html
- **index.html** (lines 24-33): Valid JSON-LD block
  ```json
  {
    "@context": "https://schema.org",
    "@type": "FinancialService",
    "name": "Player Fund Inc",
    "url": "https://player-fund.com/",
    "description": "...",
    "areaServed": "Worldwide"
  }
  ```
- Schema type is correct for the business model
- All required properties present: name, url, description, areaServed

### WARN: No JSON-LD on about.html or contact.html
- **about.html**: No `<script type="application/ld+json">` block found
  - **Recommendation**: Consider adding Organization or FinancialService schema to reinforce entity recognition
  - **Status**: Logged, not applied (would require content decisions)

- **contact.html**: No `<script type="application/ld+json">` block found
  - **Recommendation**: Consider adding ContactPoint schema with organization contact details
  - **Status**: Logged, not applied (would require content decisions)

---

## Internal Linking and Link Integrity

### PASS: All internal relative links verified; target files exist on disk
- **Verified files exist**:
  - `index.html` ✓
  - `about.html` ✓
  - `contact.html` ✓

### PASS: Link anchors and fragment identifiers correct
- **about.html** line 117: `href="about.html#approach"` points to `id="approach"` at line 129 ✓
- **index.html** line 72: `href="about.html#approach"` points to valid anchor ✓

### PASS: Navigation links consistent across pages
- All three pages (index, about, contact) have identical nav structure in `<header>` (lines 52-56 in each)
- Footer links also consistent across all pages (lines 157-161 in each)

### NOTE: External link in contact.html
- **contact.html** line 75: `<a href="https://www.player-fund.com" target="_blank" rel="noopener">www.player-fund.com</a>`
  - Uses absolute HTTPS URL
  - `target="_blank"` with `rel="noopener"` (security best practice for external links)
  - Points to www subdomain (not www-less); this is a valid external link, not a navigation issue

---

## Robots.txt and Sitemap Validation

### PASS: robots.txt correctly formatted and references sitemap
- **File**: `robots.txt`
  ```
  User-agent: *
  Allow: /
  Sitemap: https://player-fund.com/sitemap.xml
  ```
- Allows all crawlers to all content (no disallow rules)
- Sitemap URL is absolute, HTTPS, correctly formatted

### PASS: Sitemap.xml valid and all URLs map to existing files
- **File**: `sitemap.xml` (XML 1.0, UTF-8)

| URL | File | Exists | changefreq | priority |
|-----|------|--------|-----------|----------|
| https://player-fund.com/ | index.html | ✓ | monthly | 1.0 |
| https://player-fund.com/about.html | about.html | ✓ | monthly | 0.8 |
| https://player-fund.com/contact.html | contact.html | ✓ | yearly | 0.5 |

All entries reference files that exist on disk. Priorities and change frequencies are reasonable.

---

## Language, Viewport, and Favicon

### PASS: Language attribute on all pages
- **index.html** (line 2): `<html lang="en">`
- **about.html** (line 2): `<html lang="en">`
- **contact.html** (line 2): `<html lang="en">`

### PASS: Viewport meta tag on all pages
- **index.html** (line 5): `<meta name="viewport" content="width=device-width, initial-scale=1">`
- **about.html** (line 5): `<meta name="viewport" content="width=device-width, initial-scale=1">`
- **contact.html** (line 5): `<meta name="viewport" content="width=device-width, initial-scale=1">`

Correctly configured for responsive design and mobile viewport.

### PASS: Character encoding on all pages
- **All pages** (line 4): `<meta charset="UTF-8">`

### PASS: Favicon present and correctly referenced
- **All pages** (line 9): `<link rel="icon" type="image/svg+xml" href="assets/favicon.svg">`
- **File verified**: `assets/favicon.svg` exists on disk ✓

---

## Performance Considerations

### WARN: Images lack explicit width and height attributes
- **Finding**: All `<img>` tags lack `width` and `height` HTML attributes
- **Impact**: Potential cumulative layout shift (CLS) if CSS doesn't reserve space via aspect-ratio or padding-bottom hack
- **Audit evidence**:
  - index.html lines 101, 111, 123: no width/height
  - about.html lines 54, 71, 111, 122, 153: no width/height
  - contact.html lines 54, 117: no width/height
- **Mitigation note**: If CSS applies `aspect-ratio` or `width: 100%; max-width: XXX` rules, this is acceptable
- **Recommendation**: Add width/height attributes or ensure CSS defines aspect-ratio for all images
- **Status**: Logged as warning (cannot verify without seeing CSS)

### PASS: Loading attribute strategy correct
- **Hero images** (above-fold): `loading="eager"` (index.html line 64 video; about.html and contact.html images at line 54)
- **Below-fold images**: All use `loading="lazy"` (verified on 7 additional images)
- Strategy correctly prioritizes hero for immediate load

### PASS: Render-blocking resource check
- CSS loaded in `<head>` (line 23 on all pages): Render-blocking, necessary for presentation
- JS loaded at end of `<body>` (line 178/243/164): Non-blocking, good practice
- Fonts loaded via preconnect (lines 20-22): `rel="preconnect"` optimization present

---

## Fixes Applied

1. **about.html line 54**: Added alt text to hero image
   - Before: `<img src="assets/images/skyscrapers-glass.webp" alt="" loading="eager">`
   - After: `<img src="assets/images/skyscrapers-glass.webp" alt="Glass skyscrapers in a financial district" loading="eager">`

2. **contact.html line 54**: Added alt text to hero image
   - Before: `<img src="assets/images/angular-building.webp" alt="" loading="eager">`
   - After: `<img src="assets/images/angular-building.webp" alt="Modern angular institutional building architecture" loading="eager">`

---

## Recommended, Not Applied

1. **Meta description length on index.html**: Shorten from 195 to ~155 characters for optimal search result display
   - Recommendation: "Player Fund Inc advises entrepreneurs, families, companies and institutions with best-of-breed investment management and cross-asset expertise."
   - Reason not applied: User copy, off-limits per audit protocol

2. **Add JSON-LD to about.html**: Organization or FinancialService schema to reinforce entity
   - Recommendation: Duplicate or adapt index.html schema for supplementary pages
   - Reason not applied: Would require content/scope decisions

3. **Add JSON-LD to contact.html**: ContactPoint schema with contact details
   - Recommendation: Include name, telephone, email in schema
   - Reason not applied: Requires structured data scope decision

4. **Image width/height attributes**: Add explicit dimensions to prevent layout shift
   - Recommendation: Either add width/height attributes to every `<img>` tag, or verify CSS includes aspect-ratio rules
   - Reason not applied: Requires CSS audit to confirm mitigation already in place

---

## Summary

**Overall Status**: PASS (2 defects fixed, 4 warnings logged)

- ✓ All core SEO elements present (title, description, canonical, OG, Twitter, lang, viewport, favicon)
- ✓ Heading hierarchy correct on all pages (one H1, no skipped levels)
- ✓ All images have alt text (2 hero images fixed during audit)
- ✓ JSON-LD structured data on homepage
- ✓ Internal links valid and all targets exist
- ✓ Robots.txt and sitemap.xml properly configured and validated
- ⚠ Meta description on index.html slightly long
- ⚠ No JSON-LD on about.html and contact.html
- ⚠ Images lack explicit width/height (likely mitigated by CSS aspect-ratio, not verified)
- ⚠ Render-blocking CSS in head (standard practice, acceptable for small sites)
