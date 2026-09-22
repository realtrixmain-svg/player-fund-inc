// Shared password-reset relay for the portals. Each supabase/functions/reset-<site>/
// is a thin wrapper that calls serveReset() with its own constants.
//
// Deploy every wrapper with verify_jwt=false (callers are anonymous, not signed
// in). Uses the service-role key (auto-injected as SUPABASE_SERVICE_ROLE_KEY).
//
// Why this exists instead of supabase.auth.resetPasswordForEmail(): the three
// portals share one Supabase project, whose native auth email has a single
// global sender. Generating the recovery link here and sending it through Resend
// lets each portal's reset mail carry its own From name on the shared verified
// domain - exactly as _shared/signup.ts does for the confirmation mail.
import { createClient } from 'jsr:@supabase/supabase-js@2';

const RESEND_SECRET_NAME = 'RESEND_SECRET_NAME'; // matches the secret name set in Supabase
const RESEND_COOLDOWN_SECONDS = 60; // matches Supabase's own reset throttle; blunts inbox flooding

const supabaseAdmin = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
);

const corsHeaders = {
  'Access-Control-Allow-Origin': '*', // no cookies/credentials on this endpoint
  'Access-Control-Allow-Headers': 'content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

export interface ResetConfig {
  site: string;        // must match the caller's profiles.site
  siteOrigin: string;  // used to build the recovery redirect
  fromEmail: string;   // Resend From header, on the shared verified domain
}

export function serveReset({ site, siteOrigin, fromEmail }: ResetConfig) {
  Deno.serve(async (req) => {
    if (req.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders });
    }
    if (req.method !== 'POST') {
      return json({ error: 'Method not allowed' }, 405);
    }

    const { email } = await req.json().catch(() => ({}));
    if (!email) {
      return json({ error: 'Email is required.' }, 400);
    }
    const normalizedEmail = String(email).trim().toLowerCase();

    // One response for every outcome below (no account, wrong portal, cooldown,
    // even a Resend failure), so this endpoint can't be used to test which
    // addresses are registered. The real work is best-effort behind it.
    // reason is logged (never returned) so a silent skip is diagnosable in function logs
    const done = (reason = 'sent') => { console.log('reset', site, reason); return json({ ok: true }); };

    // generateLink doubles as the existence check: it errors for an unknown
    // address, which we swallow into the generic response.
    const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
      type: 'recovery',
      email: normalizedEmail,
      options: { redirectTo: `${siteOrigin}/portal/reset.html` },
    });
    if (linkError || !linkData?.user) return done('no account');

    const uid = linkData.user.id;

    // Only send if this account belongs to THIS portal, so a reset requested on
    // one portal can't email another portal's user a link wearing the wrong brand.
    // Admins are exempt: they work across all three portals.
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('site, is_admin')
      .eq('id', uid)
      .maybeSingle();
    if (!profile || (profile.site !== site && !profile.is_admin)) return done(`wrong portal: ${profile?.site ?? 'no profile'}`);

    // Light per-user cooldown to blunt inbox flooding, kept on app_metadata (only
    // the service-role key can write it) so no extra table is needed.
    const meta = (linkData.user.app_metadata ?? {}) as Record<string, unknown>;
    const last = typeof meta.last_reset_request === 'string'
      ? new Date(meta.last_reset_request).getTime()
      : 0;
    if (Date.now() - last < RESEND_COOLDOWN_SECONDS * 1000) return done('cooldown');
    await supabaseAdmin.auth.admin.updateUserById(uid, {
      app_metadata: { ...meta, last_reset_request: new Date().toISOString() },
    });

    const resetUrl = linkData.properties.action_link;
    const resendRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${Deno.env.get(RESEND_SECRET_NAME)}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: fromEmail,
        to: normalizedEmail,
        subject: 'Reset your password',
        html:
          `<p>We received a request to reset your password. Click below to choose a new one.</p>` +
          `<p><a href="${resetUrl}">Reset password</a></p>` +
          `<p>If you did not ask for this, you can safely ignore this email - your password stays the same.</p>`,
      }),
    });
    if (!resendRes.ok) {
      // Best-effort: log for us, still return the generic response so a send
      // failure can't be told apart from a non-existent address.
      console.error('reset email failed to send:', await resendRes.text());
    }

    return done();
  });
}
