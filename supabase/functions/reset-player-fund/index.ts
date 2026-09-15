// Password-reset relay for player-fund. All the logic (recovery link, site
// check, cooldown, Resend send) lives in _shared/reset.ts - this file is only
// the per-site constants. Deploy with verify_jwt=false.
import { serveReset } from '../_shared/reset.ts';

serveReset({
  site: 'player-fund',
  siteOrigin: 'https://www.player-fund.com',
  fromEmail: 'Player Fund No Reply <noreply@hamiltonportfolio.com>',
});
