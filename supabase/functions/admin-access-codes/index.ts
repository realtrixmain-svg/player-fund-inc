// Admin API for issuing and revoking portal access codes, so nobody has to
// touch SQL or the Supabase dashboard to invite a client.
//
// access_codes has `revoke all from anon, authenticated` in schema.sql, so the
// browser can never read or write it directly no matter what the client-side
// code says. Every read and write goes through here on the service-role key,
// behind an is_admin check.
//
// Deploy with verify_jwt=true: the gateway rejects anonymous callers, and the
// is_admin lookup below is what separates an admin from an ordinary client.
import { createClient } from 'jsr:@supabase/supabase-js@2';

const supabaseAdmin = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
);

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'content-type, authorization',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

const SITES = ['player-fund', 'hamilton-pe', 'hamilton-portfolio'];

// No I, O, 0 or 1: these get read aloud and typed by hand off an email, and
// those four are where that goes wrong.
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const SITE_PREFIX: Record<string, string> = {
  'player-fund': 'PF',
  'hamilton-pe': 'HPE',
  'hamilton-portfolio': 'HPF',
};

function generateCode(site: string) {
  const block = (n: number) =>
    Array.from(
      crypto.getRandomValues(new Uint8Array(n)),
      (b) => ALPHABET[b % ALPHABET.length],
    ).join('');
  return `${SITE_PREFIX[site] ?? 'PF'}-${block(4)}-${block(4)}`;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }
  if (req.method !== 'POST') {
    return json({ error: 'Method not allowed' }, 405);
  }

  // Identify the caller from their own session token, then check is_admin
  // server-side. Never trust an is_admin flag sent by the client.
  const token = req.headers.get('Authorization')?.replace(/^Bearer\s+/i, '');
  if (!token) return json({ error: 'Not signed in.' }, 401);

  const { data: userData, error: userError } = await supabaseAdmin.auth.getUser(token);
  if (userError || !userData?.user) return json({ error: 'Not signed in.' }, 401);

  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('is_admin')
    .eq('id', userData.user.id)
    .single();

  if (!profile?.is_admin) {
    return json({ error: 'Administrator access required.' }, 403);
  }

  const { action, code, site, label, email, expires_at } = await req.json().catch(() => ({}));

  if (action === 'list') {
    const { data: codes, error } = await supabaseAdmin
      .from('access_codes')
      .select('code, site, label, email, expires_at, redeemed_at, redeemed_by, created_at')
      .order('created_at', { ascending: false });
    if (error) return json({ error: error.message }, 500);

    // Resolve who redeemed each code in one round trip rather than per row.
    const ids = [...new Set((codes ?? []).map((c) => c.redeemed_by).filter(Boolean))];
    let names: Record<string, string> = {};
    if (ids.length) {
      const { data: people } = await supabaseAdmin
        .from('profiles')
        .select('id, full_name')
        .in('id', ids);
      names = Object.fromEntries((people ?? []).map((p) => [p.id, p.full_name ?? '']));
    }
    return json({
      codes: (codes ?? []).map((c) => ({ ...c, redeemed_name: names[c.redeemed_by] || null })),
    });
  }

  if (action === 'create') {
    if (!SITES.includes(site)) {
      return json({ error: 'Pick which portal this code is for.' }, 400);
    }
    // Uppercased and trimmed here as well as by the schema trigger, so the value
    // echoed back to the admin is the value that will actually be matched.
    const finalCode = code ? String(code).trim().toUpperCase() : generateCode(site);
    if (finalCode.length < 4) {
      return json({ error: 'A code needs to be at least 4 characters.' }, 400);
    }

    const { data: created, error } = await supabaseAdmin
      .from('access_codes')
      .insert({
        code: finalCode,
        site,
        label: label ? String(label).trim() : null,
        email: email ? String(email).trim().toLowerCase() : null,
        expires_at: expires_at || null,
      })
      .select('code, site, label, email, expires_at, redeemed_at, redeemed_by, created_at')
      .single();

    if (error) {
      const msg = error.code === '23505'
        ? 'That code already exists. Pick another, or leave the field blank to generate one.'
        : error.message;
      return json({ error: msg }, 400);
    }
    return json({ created });
  }

  if (action === 'revoke') {
    if (!code) return json({ error: 'No code given.' }, 400);
    // Only unredeemed codes can be revoked: deleting a redeemed one would drop
    // the record of who was let in and why, and it no longer opens anything.
    const { data: deleted, error } = await supabaseAdmin
      .from('access_codes')
      .delete()
      .eq('code', String(code).trim().toUpperCase())
      .is('redeemed_at', null)
      .select('code')
      .maybeSingle();

    if (error) return json({ error: error.message }, 500);
    if (!deleted) {
      return json({ error: 'That code has already been used, so it cannot be revoked.' }, 409);
    }
    return json({ revoked: deleted.code });
  }

  return json({ error: 'Unknown action.' }, 400);
});
