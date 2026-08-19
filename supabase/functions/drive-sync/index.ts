// Google Drive → Supabase documents sync. Option B from docs/google-drive-sync.md:
// one Drive subfolder per site, pulled into the shared 'documents' storage bucket
// and indexed in the 'documents' table, tagged by drive_file_id so re-runs don't
// create duplicates. RLS on documents/storage is untouched — this only adds rows
// the same way a manual upload would.
//
// Trigger with a POST carrying header `x-sync-secret: <SYNC_SECRET>`, either from
// a nightly pg_cron job (via net.http_post) or an on-demand admin "Sync now" call.
// Deploy with verify_jwt=false — the shared secret is the actual gate here.
import { createClient } from 'jsr:@supabase/supabase-js@2';
import { GoogleAuth } from 'npm:google-auth-library@9';

const SITES = ['player-fund', 'hamilton-pe', 'hamilton-portfolio'] as const;
type Site = (typeof SITES)[number];

// One Drive folder ID per site, set as Supabase secrets:
// DRIVE_FOLDER_PLAYER_FUND, DRIVE_FOLDER_HAMILTON_PE, DRIVE_FOLDER_HAMILTON_PORTFOLIO
const FOLDER_ENV: Record<Site, string> = {
  'player-fund': 'DRIVE_FOLDER_PLAYER_FUND',
  'hamilton-pe': 'DRIVE_FOLDER_HAMILTON_PE',
  'hamilton-portfolio': 'DRIVE_FOLDER_HAMILTON_PORTFOLIO',
};

const supabaseAdmin = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
);

async function getAccessToken(): Promise<string> {
  const keyJson = Deno.env.get('GOOGLE_SERVICE_ACCOUNT_KEY');
  if (!keyJson) throw new Error('GOOGLE_SERVICE_ACCOUNT_KEY secret not set');
  const auth = new GoogleAuth({
    credentials: JSON.parse(keyJson),
    scopes: ['https://www.googleapis.com/auth/drive.readonly'],
  });
  const client = await auth.getClient();
  const { token } = await client.getAccessToken();
  if (!token) throw new Error('Failed to get Google access token');
  return token;
}

async function listFolderFiles(folderId: string, token: string) {
  const url = new URL('https://www.googleapis.com/drive/v3/files');
  url.searchParams.set('q', `'${folderId}' in parents and trashed = false`);
  url.searchParams.set('fields', 'files(id,name,mimeType)');
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) throw new Error(`Drive list failed: ${await res.text()}`);
  const { files } = await res.json();
  return files as { id: string; name: string; mimeType: string }[];
}

async function downloadFile(fileId: string, token: string): Promise<Blob> {
  const res = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`Drive download failed for ${fileId}: ${await res.text()}`);
  return await res.blob();
}

async function syncSite(site: Site, token: string) {
  const folderId = Deno.env.get(FOLDER_ENV[site]);
  if (!folderId) return { site, skipped: 'no folder ID configured' };

  const files = await listFolderFiles(folderId, token);
  let created = 0;
  let updated = 0;

  // ponytail: re-downloads and re-uploads every file on every run rather than
  // diffing on Drive's modifiedTime — fine at this document volume (a handful of
  // PDFs per site), revisit with a modifiedTime check if a folder grows large.
  for (const file of files) {
    const blob = await downloadFile(file.id, token);
    const storagePath = `${site}/${file.id}-${file.name}`;

    const { error: uploadError } = await supabaseAdmin.storage
      .from('documents')
      .upload(storagePath, blob, { upsert: true, contentType: file.mimeType });
    if (uploadError) throw uploadError;

    const { data: existing } = await supabaseAdmin
      .from('documents')
      .select('id')
      .eq('drive_file_id', file.id)
      .maybeSingle();

    if (existing) {
      await supabaseAdmin
        .from('documents')
        .update({ title: file.name, storage_path: storagePath })
        .eq('id', existing.id);
      updated++;
    } else {
      await supabaseAdmin
        .from('documents')
        .insert({ title: file.name, storage_path: storagePath, site, drive_file_id: file.id });
      created++;
    }
  }

  return { site, seen: files.length, created, updated };
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405 });
  }
  if (req.headers.get('x-sync-secret') !== Deno.env.get('SYNC_SECRET')) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  }

  try {
    const token = await getAccessToken();
    const results = await Promise.all(SITES.map((site) => syncSite(site, token)));
    return new Response(JSON.stringify({ ok: true, results }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), { status: 500 });
  }
});
