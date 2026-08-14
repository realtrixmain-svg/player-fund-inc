# Player Fund Inc

Three-page marketing site (Home, About, Contact). Plain HTML/CSS/JS, no build step, no framework, deploy as-is to any static host (GitHub Pages, Netlify, etc.).

## Structure

- `index.html`, `about.html`, `contact.html`
- `css/style.css` - full design system (tokens, components)
- `js/main.js` - nav toggle, scroll reveals (IntersectionObserver), contact form UI state
- `assets/images/` - sourced stock photography (Unsplash, hotlinked once then saved locally, no attribution required under their license)
- `assets/video/hero.mp4` - hero background loop (Pexels, compressed with ffmpeg: trimmed, muted, scaled, h264 crf 26)

## Known placeholders

Contact page email/hours are placeholders (`enquiries@player-fund.com`) - the brochure supplied for this build did not include a real phone number or office address. Swap in real contact details before going live. The contact form is front-end only (no backend wired up).

SEO tags (canonical, OG/Twitter, sitemap.xml, robots.txt) are wired up against the placeholder domain `https://player-fund.com` - find-and-replace with the real production domain before going live.

## Brand source

Palette and wordmark sampled from the supplied Player Fund brochure (navy `#2f3f66`, gold `#a6915f`). Copy for Home/About follows the brochure's real section headings (Our Story, Our Values, Our Philosophy, Our Approach, Investment Process, Governance & Risk Management); body copy was written in-voice where the source brochure's print resolution made the original body text illegible.
