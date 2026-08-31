import { supabase } from './supabase-client.js';
import { SITE } from './config.js';
import { callFunction, wireSignOut } from './admin-guard.js';

const greeting = document.getElementById('greeting');
const docList = document.getElementById('doc-list');

const { data: { session } } = await supabase.auth.getSession();
if (!session) {
  window.location.href = 'login.html';
} else {
  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, is_admin')
    .eq('id', session.user.id)
    .single();

  const name = profile?.full_name || session.user.email;
  greeting.textContent = `Welcome, ${name}`;

  // Cosmetic only: access_codes is revoked from anon and authenticated, and
  // every document write is gated on public.is_verified_admin(), so the pages
  // behind these links are useless without both flags on the server side.
  if (profile?.is_admin) {
    document.getElementById('admin-card').hidden = false;
    const verified = await callFunction('admin-verify', { action: 'status' })
      .then((r) => r.verified)
      .catch(() => false);
    if (!verified) {
      const note = document.getElementById('admin-note');
      note.textContent = 'Verify your email to unlock the administration tools for this session.';
      document.querySelector('.admin-links').innerHTML =
        '<a class="text-link" href="admin-verify.html">Send me a sign-in code</a>';
    }
  }

  // RLS already restricts a client to their own site, so this filter changes
  // nothing for them. It matters for an admin, who can see all three sites'
  // rows: without it this portal would list a document whose file lives in
  // another site's bucket, and the download below would 404 on it.
  const { data: docs, error } = await supabase
    .from('documents')
    .select('id, title, description, storage_path')
    .eq('site', SITE)
    .order('created_at', { ascending: false });

  docList.innerHTML = '';
  if (error) {
    const li = document.createElement('li');
    li.className = 'form-note';
    li.textContent = `Could not load documents: ${error.message}`;
    docList.appendChild(li);
  } else if (!docs || docs.length === 0) {
    const li = document.createElement('li');
    li.className = 'form-note';
    li.textContent = 'No documents yet.';
    docList.appendChild(li);
  } else {
    for (const doc of docs) {
      const li = document.createElement('li');
      li.className = 'doc-item';

      const info = document.createElement('div');
      const strong = document.createElement('strong');
      strong.textContent = doc.title;
      info.appendChild(strong);
      if (doc.description) {
        const desc = document.createElement('p');
        desc.className = 'form-note';
        desc.textContent = doc.description;
        info.appendChild(desc);
      }

      const downloadBtn = document.createElement('button');
      downloadBtn.type = 'button';
      downloadBtn.className = 'btn btn-ghost doc-download';
      downloadBtn.innerHTML = '<span>Download</span>';

      li.appendChild(info);
      li.appendChild(downloadBtn);

      downloadBtn.addEventListener('click', async (e) => {
        const btn = e.currentTarget;
        btn.disabled = true;
        // Fetch the file as a blob and save it via a hidden <a download>, instead
        // of window.open(): no new tab/window is ever created, so there is
        // nothing for a popup blocker to catch.
        try {
          const { data, error: urlError } = await supabase.storage
            .from(`documents-${SITE}`)
            .createSignedUrl(doc.storage_path, 60);
          if (urlError) throw urlError;
          const res = await fetch(data.signedUrl);
          if (!res.ok) throw new Error(`Download failed (${res.status})`);
          const blobUrl = URL.createObjectURL(await res.blob());
          const ext = doc.storage_path.includes('.')
            ? doc.storage_path.slice(doc.storage_path.lastIndexOf('.'))
            : '';
          const a = document.createElement('a');
          a.href = blobUrl;
          a.download = `${doc.title}${ext}`;
          document.body.appendChild(a);
          a.click();
          a.remove();
          URL.revokeObjectURL(blobUrl);
        } catch (err) {
          alert(`Could not download document: ${err.message}`);
        } finally {
          btn.disabled = false;
        }
      });
      docList.appendChild(li);
    }
  }
}

// wireSignOut, not a bare auth.signOut(): for an admin it also closes the
// server-side verification window, which otherwise outlives the browser session.
wireSignOut();
