// Signup relay for player-fund. Deploy with verify_jwt=false (callers are
// anonymous signups, not authenticated users). Uses the service-role key
// (auto-injected by Supabase as SUPABASE_SERVICE_ROLE_KEY) so `site` is set
// here, server-side, and never trusted from the client. See the note on
// handle_new_user() in supabase/schema.sql for why that matters.
import { createClient } from 'jsr:@supabase/supabase-js@2';

const SITE = 'player-fund';
const SITE_ORIGIN = 'https://player-fund.com';
const FROM_EMAIL = 'Player Fund Inc <noreply@player-fund.com>'; // domain must be verified in Resend
const RESEND_SECRET_NAME = 'RESEND_KEY'; // adjust if the secret is named differently in Supabase

const supabaseAdmin = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
);

const corsHeaders = {
  'Access-Control-Allow-Origin': SITE_ORIGIN,
  'Access-Control-Allow-Headers': 'content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }
  if (req.method !== 'POST') {
    return json({ error: 'Method not allowed' }, 405);
  }

  const { email, password, full_name } = await req.json().catch(() => ({}));
  if (!email || !password) {
    return json({ error: 'Email and password are required.' }, 400);
  }

  const { data: created, error: createError } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: false,
    user_metadata: full_name ? { full_name } : undefined,
  });
  if (createError) {
    return json({ error: createError.message }, 400);
  }

  const { error: siteError } = await supabaseAdmin
    .from('profiles')
    .update({ site: SITE })
    .eq('id', created.user.id);
  if (siteError) {
    return json({ error: siteError.message }, 500);
  }

  const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
    type: 'signup',
    email,
    password,
    options: { redirectTo: `${SITE_ORIGIN}/portal/verified.html` },
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
      from: FROM_EMAIL,
      to: email,
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
