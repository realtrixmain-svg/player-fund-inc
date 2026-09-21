// Password-reset relay for hamilton-portfolio. All the logic (recovery link, site
// check, cooldown, Resend send) lives in _shared/reset.ts - this file is only
// the per-site constants. Deploy with verify_jwt=false.
import { serveReset } from '../_shared/reset.ts';

serveReset({
  site: 'hamilton-portfolio',
  siteOrigin: 'https://hamiltonportfolio.com',
  fromEmail: 'Hamilton Portfolio <noreply@hamiltonportfolio.com>',
});
