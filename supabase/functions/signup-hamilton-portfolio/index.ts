// Signup relay for hamilton-portfolio. All the logic (access-code redemption, user
// creation, site assignment, verification email) lives in _shared/signup.ts -
// this file is only the per-site constants. Deploy with verify_jwt=false.
import { serveSignup } from '../_shared/signup.ts';

serveSignup({
  site: 'hamilton-portfolio',
  siteOrigin: 'https://hamiltonportfolio.com',
  fromEmail: 'Hamilton Portfolio <noreply@hamiltonportfolio.com>',
});
