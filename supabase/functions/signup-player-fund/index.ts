// Signup relay for player-fund. All the logic (access-code redemption, user
// creation, site assignment, verification email) lives in _shared/signup.ts -
// this file is only the per-site constants. Deploy with verify_jwt=false.
import { serveSignup } from '../_shared/signup.ts';

serveSignup({
  site: 'player-fund',
  siteOrigin: 'https://www.player-fund.com',
  fromEmail: 'Player Fund Inc <noreply@hamiltonportfolio.com>',
});
