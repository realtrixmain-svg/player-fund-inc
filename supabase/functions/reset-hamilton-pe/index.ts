// Password-reset relay for hamilton-pe. All the logic (recovery link, site
// check, cooldown, Resend send) lives in _shared/reset.ts - this file is only
// the per-site constants. Deploy with verify_jwt=false.
import { serveReset } from '../_shared/reset.ts';

serveReset({
  site: 'hamilton-pe',
  siteOrigin: 'https://hamiltonprivateequity.co.za',
  fromEmail: 'HPE No Reply <noreply@hamiltonportfolio.com>',
});
