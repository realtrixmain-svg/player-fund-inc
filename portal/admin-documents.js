import { supabase } from './supabase-client.js';
import { requireVerifiedAdmin, wireSignOut } from './admin-guard.js';

const page = document.getElementById('page');
const form = document.getElementById('upload-form');
const uploadBtn = document.getElementById('upload-btn');
const uploadStatus = document.getElementById('upload-status');
const fileInput = document.getElementById('file');
const filterSite = document.getElementById('filter-site');
const tbody = document.getElementById('docs-body');

wireSignOut();

const session = await requireVerifiedAdmin();
if (session) {
  page.hidden = false;
  filterSite.value = 'player-fund';
  loadDocs();
}

// Storage object keys are matched literally against documents.storage_path, and
// they travel through signed URLs - keep them to characters that survive both
// without escaping. The existing six player-fund files use spaces and hyphens,
// which is why spaces are collapsed rather than rejected.
function safeName(name) {
  return name
    .normalize('NFKD')
    .replace(/[^\w.\- ]+/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 120) || 'document.pdf';
}

function bucketFor(site) {
  return `documents-${site}`;
}

async function loadDocs() {
  const site = filterSite.value;
  tbody.replaceChildren();
  const { data: docs, error } = await supabase
    .from('documents')
    .select('id, title, description, storage_path, created_at')
    .eq('site', site)
    .order('created_at', { ascending: false });

  if (error) return note(`Could not load documents: ${error.message}`);
  if (!docs.length) return note('No documents filed under this portal yet.');
  docs.forEach((d) => tbody.appendChild(row(d, site)));
}

function note(text) {
  const tr = document.createElement('tr');
  const td = document.createElement('td');
  td.colSpan = 4;
  td.className = 'form-note';
  td.textContent = text;
  tr.appendChild(td);
  tbody.appendChild(tr);
}

function row(doc, site) {
  const tr = document.createElement('tr');

  const titleCell = document.createElement('td');
  const strong = document.createElement('strong');
  strong.textContent = doc.title;
  titleCell.appendChild(strong);
  if (doc.description) {
    const desc = document.createElement('p');
    desc.className = 'form-note';
    desc.textContent = doc.description;
    titleCell.appendChild(desc);
  }

  const fileCell = document.createElement('td');
  fileCell.className = 'doc-path';
  fileCell.textContent = doc.storage_path;

  const dateCell = document.createElement('td');
  dateCell.textContent = new Date(doc.created_at).toLocaleDateString();

  const actionCell = document.createElement('td');
  actionCell.className = 'doc-actions';

  const view = document.createElement('button');
  view.type = 'button';
  view.className = 'btn btn-ghost btn-small';
  view.innerHTML = '<span>View</span>';
  view.addEventListener('click', async () => {
    // Open the tab on the click itself, before the await, or the popup blocker
    // treats the later navigation as unprompted. Same reason as in
    // portal-dashboard.js.
    const tab = window.open('', '_blank', 'noopener');
    const { data, error } = await supabase.storage
      .from(bucketFor(site))
      .createSignedUrl(doc.storage_path, 60);
    if (error) {
      if (tab) tab.close();
      alert(`Could not open the file: ${error.message}`);
    } else if (tab) {
      tab.location = data.signedUrl;
    } else {
      alert('Your browser blocked the tab. Allow pop-ups for this site and try again.');
    }
  });

  const remove = document.createElement('button');
  remove.type = 'button';
  remove.className = 'btn btn-ghost btn-small';
  remove.innerHTML = '<span>Delete</span>';
  remove.addEventListener('click', async () => {
    if (!confirm(`Delete "${doc.title}"? Clients of this portal will no longer see it, and the file is removed from storage.`)) return;
    remove.disabled = true;
    // File first, row second. The other order would leave an unreferenced
    // object sitting in the bucket with nothing left pointing at it to clean up.
    const { error: storageError } = await supabase.storage
      .from(bucketFor(site))
      .remove([doc.storage_path]);
    if (storageError) {
      alert(`Could not delete the file: ${storageError.message}`);
      remove.disabled = false;
      return;
    }
    const { error: rowError } = await supabase.from('documents').delete().eq('id', doc.id);
    if (rowError) alert(`The file was removed but its entry could not be deleted: ${rowError.message}`);
    loadDocs();
  });

  actionCell.append(view, remove);
  tr.append(titleCell, fileCell, dateCell, actionCell);
  return tr;
}

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  uploadStatus.textContent = '';
  const file = fileInput.files[0];
  if (!file) {
    uploadStatus.textContent = 'Choose a file to upload.';
    return;
  }

  const site = document.getElementById('site').value;
  const title = document.getElementById('title').value.trim();
  const description = document.getElementById('description').value.trim();
  const path = safeName(file.name);

  uploadBtn.disabled = true;
  uploadStatus.textContent = 'Uploading...';

  // upsert stays off on purpose: an accidental re-upload of a same-named file
  // would otherwise silently replace a document other clients are already
  // reading, with no record that it changed.
  const { error: uploadError } = await supabase.storage
    .from(bucketFor(site))
    .upload(path, file, { upsert: false, contentType: file.type || undefined });

  if (uploadError) {
    uploadStatus.textContent = /exists/i.test(uploadError.message)
      ? `A file named "${path}" is already in this portal. Rename the file and upload it again.`
      : uploadError.message;
    uploadBtn.disabled = false;
    return;
  }

  const { error: rowError } = await supabase.from('documents').insert({
    title,
    description: description || null,
    storage_path: path,
    site,
    uploaded_by: session.user.id,
  });

  if (rowError) {
    // No row means no client can ever see the file, and the name is now taken
    // for the next attempt. Put the bucket back how it was.
    await supabase.storage.from(bucketFor(site)).remove([path]);
    uploadStatus.textContent = `Upload failed: ${rowError.message}`;
    uploadBtn.disabled = false;
    return;
  }

  uploadStatus.textContent = `"${title}" is now available to ${site} clients.`;
  form.reset();
  uploadBtn.disabled = false;
  filterSite.value = site;
  loadDocs();
});

filterSite.addEventListener('change', loadDocs);
