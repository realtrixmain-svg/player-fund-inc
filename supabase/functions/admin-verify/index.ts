// Step-up email verification for administrators.
//
// A password on its own must not open the admin portal. After an admin signs in
// with their password they land here: this function emails a six-digit code
// through Resend, and only when that code comes back does it write the
// admin_sessions row that public.is_verified_admin() looks for. Every admin
// power in the system - reading all three sites' documents, uploading into any
// bucket, issuing access codes - hangs off that function, in RLS and in
// supabase/functions/admin-access-codes. So an attacker with the admin password
// but no access to the mailbox gets an ordinary client session and nothing else.
//
// Both tables are RLS-on with no policies and no grants, so the browser can
// never write itself a session; only the service-role key used here can.
//
// Deploy with verify_jwt=true.
import { createClient } from 'jsr:@supabase/supabase-js@2';

const RESEND_SECRET_NAME = 'RESEND_SECRET_NAME'; // matches the secret name set in Supabase
const FROM_EMAIL = 'Player Fund Inc <noreply@hamiltonportfolio.com>';

const CODE_TTL_MINUTES = 10;
const SESSION_TTL_HOURS = 12;
const MAX_ATTEMPTS = 5;
const RESEND_COOLDOWN_SECONDS = 45;

const supabaseAdmin = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
);

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  // supabase-js functions.invoke() sends apikey and x-client-info alongside
  // authorization, and a preflight that does not name every one of them makes
  // the browser drop the real request before it is sent - surfacing as the
  // opaque "Failed to send a request to the Edge Function". The signup
  // functions get away with a shorter list only because portal-signup.js calls
  // them with a bare fetch() instead of invoke().
  'Access-Control-Allow-Headers': 'content-type, authorization, apikey, x-client-info',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

// Six digits, uniformly. Rejecting the tail of the byte range instead of taking
// a modulo keeps every digit equally likely, which matters more here than it
// would for a lookup key: this is the whole second factor.
function generateCode() {
  let out = '';
  while (out.length < 6) {
    for (const b of crypto.getRandomValues(new Uint8Array(8))) {
      if (b < 250 && out.length < 6) out += String(b % 10);
    }
  }
  return out;
}

async function hashCode(userId: string, code: string) {
  const data = new TextEncoder().encode(`${userId}:${code}`);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

// Compare in constant time so the number of matching leading characters can't
// be read off the response latency.
function timingSafeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

// Which browser session redeemed the code, read off the caller's own access
// token. getUser() above has already verified that token's signature, so this
// only has to pull the claim back out - it is not trusting unverified input.
// Elevation is bound to this value so that an attacker signed in on the same
// account is not carried along when the real admin redeems a code.
function sessionIdOf(token: string): string | null {
  try {
    const payload = token.split('.')[1];
    const json = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
    return JSON.parse(json).session_id ?? null;
  } catch {
    return null;
  }
}

// n***@example.com - enough for the admin to recognise the mailbox, not enough
// to hand a full address to whoever is holding a stolen password.
function maskEmail(email: string) {
  const [user, domain] = email.split('@');
  if (!domain) return 'your email address';
  return `${user.slice(0, 1)}${'*'.repeat(Math.max(user.length - 1, 1))}@${domain}`;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }
  if (req.method !== 'POST') {
    return json({ error: 'Method not allowed' }, 405);
  }

  const token = req.headers.get('Authorization')?.replace(/^Bearer\s+/i, '');
  if (!token) return json({ error: 'Not signed in.' }, 401);

  const { data: userData, error: userError } = await supabaseAdmin.auth.getUser(token);
  if (userError || !userData?.user) return json({ error: 'Not signed in.' }, 401);
  const user = userData.user;

  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('is_admin')
    .eq('id', user.id)
    .single();

  if (!profile?.is_admin) {
    return json({ error: 'Administrator access required.' }, 403);
  }

  const sessionId = sessionIdOf(token);
  if (!sessionId) {
    return json({ error: 'This sign-in cannot be verified. Sign out and sign in again.' }, 401);
  }

  const { action, code } = await req.json().catch(() => ({}));

  if (action === 'status') {
    const { data: sessionRow } = await supabaseAdmin
      .from('admin_sessions')
      .select('expires_at, session_id')
      .eq('user_id', user.id)
      .maybeSingle();
    const verified = !!sessionRow &&
      sessionRow.session_id === sessionId &&
      new Date(sessionRow.expires_at) > new Date();
    return json({ verified, expires_at: verified ? sessionRow!.expires_at : null });
  }

  if (action === 'challenge') {
    // Don't let a repeated page load (or someone hammering the button) turn into
    // an inbox full of codes. Inside the cooldown the existing code stands.
    const { data: existing } = await supabaseAdmin
      .from('admin_login_codes')
      .select('created_at')
      .eq('user_id', user.id)
      .maybeSingle();
    if (
      existing &&
      Date.now() - new Date(existing.created_at).getTime() < RESEND_COOLDOWN_SECONDS * 1000
    ) {
      return json({ ok: true, sent_to: maskEmail(user.email ?? ''), resent: false });
    }

    const plain = generateCode();
    const { error: storeError } = await supabaseAdmin
      .from('admin_login_codes')
      .upsert({
        user_id: user.id,
        code_hash: await hashCode(user.id, plain),
        attempts: 0,
        expires_at: new Date(Date.now() + CODE_TTL_MINUTES * 60_000).toISOString(),
        created_at: new Date().toISOString(),
      });
    if (storeError) return json({ error: storeError.message }, 500);

    const resendRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${Deno.env.get(RESEND_SECRET_NAME)}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to: user.email,
        subject: `${plain} is your administrator sign-in code`,
        html:
          `<p>Your administrator sign-in code is:</p>` +
          `<p style="font-size:28px;letter-spacing:6px;font-family:monospace"><strong>${plain}</strong></p>` +
          `<p>It expires in ${CODE_TTL_MINUTES} minutes and can only be used once.</p>` +
          `<p>If you did not just try to sign in to the administrator portal, someone else has your password. Change it immediately.</p>`,
      }),
    });
    if (!resendRes.ok) {
      // Drop the code we just stored: leaving it would silently lock the admin
      // out for the next ten minutes behind the cooldown above.
      await supabaseAdmin.from('admin_login_codes').delete().eq('user_id', user.id);
      const body = await resendRes.text();
      return json({ error: `Could not send the verification email: ${body}` }, 502);
    }

    return json({ ok: true, sent_to: maskEmail(user.email ?? ''), resent: true });
  }

  if (action === 'verify') {
    const submitted = String(code ?? '').replace(/\D/g, '');
    if (submitted.length !== 6) {
      return json({ error: 'Enter the six-digit code from your email.' }, 400);
    }

    const { data: row } = await supabaseAdmin
      .from('admin_login_codes')
      .select('code_hash, attempts, expires_at')
      .eq('user_id', user.id)
      .maybeSingle();

    if (!row || new Date(row.expires_at) < new Date()) {
      return json({ error: 'That code has expired. Send yourself a new one.' }, 403);
    }
    if (row.attempts >= MAX_ATTEMPTS) {
      await supabaseAdmin.from('admin_login_codes').delete().eq('user_id', user.id);
      return json({ error: 'Too many incorrect attempts. Send yourself a new code.' }, 429);
    }

    if (!timingSafeEqual(row.code_hash, await hashCode(user.id, submitted))) {
      await supabaseAdmin
        .from('admin_login_codes')
        .update({ attempts: row.attempts + 1 })
        .eq('user_id', user.id);
      return json({ error: 'That code is not correct.' }, 403);
    }

    // Spend the code before granting the session, so a replay of the same
    // request cannot extend the window twice off one email.
    await supabaseAdmin.from('admin_login_codes').delete().eq('user_id', user.id);

    const expiresAt = new Date(Date.now() + SESSION_TTL_HOURS * 3_600_000).toISOString();
    const { error: sessionError } = await supabaseAdmin
      .from('admin_sessions')
      .upsert({
        user_id: user.id,
        session_id: sessionId,
        verified_at: new Date().toISOString(),
        expires_at: expiresAt,
      });
    if (sessionError) return json({ error: sessionError.message }, 500);

    return json({ ok: true, expires_at: expiresAt });
  }

  if (action === 'end') {
    await supabaseAdmin.from('admin_sessions').delete().eq('user_id', user.id);
    return json({ ok: true });
  }

  return json({ error: 'Unknown action.' }, 400);
});
