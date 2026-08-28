import { supabase } from './supabase-client.js';

const greeting = document.getElementById('greeting');
const docList = document.getElementById('doc-list');
const signOutBtn = document.getElementById('sign-out');

const { data: { session } } = await supabase.auth.getSession();
if (!session) {
  window.location.href = 'login.html';
} else {
  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name')
    .eq('id', session.user.id)
    .single();

  const name = profile?.full_name || session.user.email;
  greeting.textContent = `Welcome, ${name}`;

  const { data: docs, error } = await supabase
    .from('documents')
    .select('id, title, description, storage_path')
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
        // Open the tab synchronously on the click (before the await) so the browser's
        // popup blocker still sees it as user-initiated; set its location once the
        // signed URL resolves. Setting data.signedUrl into window.open() directly after
        // an await loses the user-activation flag and gets silently blocked.
        const tab = window.open('', '_blank', 'noopener');
        const { data, error: urlError } = await supabase.storage
          .from('documents')
          .createSignedUrl(doc.storage_path, 60);
        btn.disabled = false;
        if (urlError) {
          if (tab) tab.close();
          alert(`Could not generate download link: ${urlError.message}`);
        } else if (tab) {
          tab.location = data.signedUrl;
        } else {
          alert('Your browser blocked the download tab. Please allow pop-ups for this site and try again.');
        }
      });
      docList.appendChild(li);
    }
  }
}

signOutBtn.addEventListener('click', async () => {
  await supabase.auth.signOut();
  window.location.href = 'login.html';
});
