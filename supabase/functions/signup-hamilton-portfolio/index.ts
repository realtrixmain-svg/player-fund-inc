// Signup relay for hamilton-portfolio. Deploy with verify_jwt=false (callers
// are anonymous signups, not authenticated users). Uses the service-role key
// (auto-injected by Supabase as SUPABASE_SERVICE_ROLE_KEY) so `site` is set
// here, server-side, and never trusted from the client. See the note on
// handle_new_user() in supabase/schema.sql for why that matters.
import { createClient } from 'jsr:@supabase/supabase-js@2';

const SITE = 'hamilton-portfolio';
const SITE_ORIGIN = 'https://hamiltonportfolio.co.uk';
const FROM_EMAIL = 'Hamilton Portfolio <noreply@hamiltonportfolio.co.uk>'; // domain must be verified in Resend
const RESEND_SECRET_NAME = 'RESEND_KEY'; // adjust if the secret is named differently in Supabase

const supabaseAdmin = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
);

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405 });
  }

  const { email, password, full_name } = await req.json().catch(() => ({}));
  if (!email || !password) {
    return new Response(JSON.stringify({ error: 'Email and password are required.' }), { status: 400 });
  }

  const { data: created, error: createError } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: false,
    user_metadata: full_name ? { full_name } : undefined,
  });
  if (createError) {
    return new Response(JSON.stringify({ error: createError.message }), { status: 400 });
  }

  const { error: siteError } = await supabaseAdmin
    .from('profiles')
    .update({ site: SITE })
    .eq('id', created.user.id);
  if (siteError) {
    return new Response(JSON.stringify({ error: siteError.message }), { status: 500 });
  }

  const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
    type: 'signup',
    email,
    password,
    options: { redirectTo: `${SITE_ORIGIN}/portal/verified.html` },
  });
  if (linkError) {
    return new Response(JSON.stringify({ error: linkError.message }), { status: 400 });
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
    return new Response(JSON.stringify({ error: `Account created, but the verification email failed to send: ${body}` }), { status: 502 });
  }

  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
});
