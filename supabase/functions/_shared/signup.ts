// Shared signup relay for all three portals. Each supabase/functions/signup-<site>/
// is a thin wrapper that calls serveSignup() with its own constants.
//
// Deploy every wrapper with verify_jwt=false (callers are anonymous signups, not
// authenticated users). Uses the service-role key (auto-injected by Supabase as
// SUPABASE_SERVICE_ROLE_KEY) so `site` is set here, server-side, and never
// trusted from the client. See the note on handle_new_user() in
// supabase/schema.sql for why that matters.
import { createClient } from 'jsr:@supabase/supabase-js@2';

const RESEND_SECRET_NAME = 'RESEND_SECRET_NAME'; // matches the secret name set in Supabase

const supabaseAdmin = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
);

const corsHeaders = {
  'Access-Control-Allow-Origin': '*', // no cookies/credentials on this endpoint, so a fixed origin isn't needed
  'Access-Control-Allow-Headers': 'content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

// One message for every way a code can fail (unknown, wrong site, already spent,
// expired, issued to a different address). Saying which one it was would let
// someone probing the endpoint map out valid codes without redeeming any.
const CODE_REJECTED = 'That access code is not valid for this portal, has already been used, or was issued to a different email address.';

export interface SignupConfig {
  site: string;        // must match a value in the access_codes/profiles site check
  siteOrigin: string;  // used to build the email-confirmation redirect
  fromEmail: string;   // Resend From header, on the shared verified domain
}

export function serveSignup({ site, siteOrigin, fromEmail }: SignupConfig) {
  // Hand a claimed code back if anything after the claim fails, so a failed
  // signup doesn't silently burn the invitee's one-shot code.
  const releaseCode = (code: string) =>
    supabaseAdmin
      .from('access_codes')
      .update({ redeemed_at: null, redeemed_by: null })
      .eq('code', code);

  Deno.serve(async (req) => {
    if (req.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders });
    }
    if (req.method !== 'POST') {
      return json({ error: 'Method not allowed' }, 405);
    }

    const { email, password, full_name, access_code } = await req.json().catch(() => ({}));
    if (!email || !password) {
      return json({ error: 'Email and password are required.' }, 400);
    }
    if (!access_code) {
      return json({ error: 'An access code is required to create an account.' }, 400);
    }

    const code = String(access_code).trim().toUpperCase(); // matches the normalize trigger in schema.sql
    const normalizedEmail = String(email).trim().toLowerCase();

    // Claim the code and create the account in one conditional UPDATE: filtering
    // on `redeemed_at is null` inside the write means two simultaneous requests
    // for the same code cannot both come back with a row, so a single-use code
    // stays single-use without a transaction or a lock. Filtering on `site` here
    // is what stops a hamilton-portfolio code opening a hamilton-pe account.
    const { data: claimed, error: claimError } = await supabaseAdmin
      .from('access_codes')
      .update({ redeemed_at: new Date().toISOString() })
      .eq('code', code)
      .eq('site', site)
      .is('redeemed_at', null)
      .select('code, email, expires_at')
      .maybeSingle();

    if (claimError) {
      return json({ error: claimError.message }, 500);
    }
    if (!claimed) {
      return json({ error: CODE_REJECTED }, 403);
    }

    // Expiry and the optional email lock are checked here rather than in the
    // UPDATE filter: PostgREST's .or() takes a filter string, and interpolating
    // a caller-supplied email into one is an injection surface. Claim first,
    // validate in code, release on rejection.
    if (claimed.expires_at && new Date(claimed.expires_at) < new Date()) {
      await releaseCode(code);
      return json({ error: CODE_REJECTED }, 403);
    }
    if (claimed.email && claimed.email !== normalizedEmail) {
      await releaseCode(code);
      return json({ error: CODE_REJECTED }, 403);
    }

    const { data: created, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email: normalizedEmail,
      password,
      email_confirm: false,
      user_metadata: full_name ? { full_name } : undefined,
    });
    if (createError) {
      await releaseCode(code);
      return json({ error: createError.message }, 400);
    }

    // If this update fails the account still exists, sitting on the 'unassigned'
    // default from handle_new_user(). That reads nothing, so it is not an access
    // problem - but it is an orphan the invitee cannot use and cannot re-create,
    // since their email is now taken. Delete it, then hand the code back so the
    // invitee can simply try again.
    const { error: siteError } = await supabaseAdmin
      .from('profiles')
      .update({ site })
      .eq('id', created.user.id);
    if (siteError) {
      await supabaseAdmin.auth.admin.deleteUser(created.user.id);
      await releaseCode(code);
      return json({ error: siteError.message }, 500);
    }

    await supabaseAdmin
      .from('access_codes')
      .update({ redeemed_by: created.user.id })
      .eq('code', code);

    const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
      type: 'signup',
      email: normalizedEmail,
      password,
      options: { redirectTo: `${siteOrigin}/portal/verified.html` },
    });
    if (linkError) {
      return json({ error: linkError.message }, 400);
    }

    const confirmUrl = linkData.properties.action_link;

    const resendRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${Deno.env.get(RESEND_SECRET_NAME)}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: fromEmail,
        to: normalizedEmail,
        subject: 'Confirm your email',
        html: `<p>Click below to confirm your email and finish setting up your account.</p><p><a href="${confirmUrl}">Confirm email</a></p>`,
      }),
    });
    if (!resendRes.ok) {
      const body = await resendRes.text();
      return json({ error: `Account created, but the verification email failed to send: ${body}` }, 502);
    }

    return json({ ok: true });
  });
}
