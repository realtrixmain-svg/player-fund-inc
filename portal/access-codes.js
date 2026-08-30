import { requireVerifiedAdmin, callFunction, wireSignOut } from './admin-guard.js';

const page = document.getElementById('page');
const form = document.getElementById('issue-form');
const issueBtn = document.getElementById('issue-btn');
const status = document.getElementById('issue-status');
const result = document.getElementById('code-result');
const resultCode = document.getElementById('result-code');
const resultWho = document.getElementById('result-who');
const copyBtn = document.getElementById('copy-btn');
const tbody = document.getElementById('codes-body');

const SITE_LABEL = {
  'player-fund': 'Player Fund',
  'hamilton-pe': 'Hamilton PE',
  'hamilton-portfolio': 'Hamilton Portfolio',
};

const callAdmin = (body) => callFunction('admin-access-codes', body);

wireSignOut();

// The real gate is the is_admin + step-up check inside the edge function; this
// only decides whether to render, so a client or an unverified admin gets sent
// somewhere useful instead of a table that fails to load.
if (await requireVerifiedAdmin()) {
  page.hidden = false;
  loadCodes();
}

function statusOf(c) {
  if (c.redeemed_at) {
    const who = c.redeemed_name ? ` by ${c.redeemed_name}` : '';
    return { text: `Used${who} on ${new Date(c.redeemed_at).toLocaleDateString()}`, spent: true };
  }
  if (c.expires_at && new Date(c.expires_at) < new Date()) {
    return { text: `Expired ${new Date(c.expires_at).toLocaleDateString()}`, spent: true };
  }
  if (c.expires_at) {
    return { text: `Unused, expires ${new Date(c.expires_at).toLocaleDateString()}`, spent: false };
  }
  return { text: 'Unused', spent: false };
}

function row(c) {
  const tr = document.createElement('tr');
  const s = statusOf(c);

  const codeCell = document.createElement('td');
  const codeEl = document.createElement('code');
  codeEl.className = 'code-cell';
  codeEl.textContent = c.code;
  codeCell.appendChild(codeEl);

  const siteCell = document.createElement('td');
  siteCell.textContent = SITE_LABEL[c.site] ?? c.site;

  const whoCell = document.createElement('td');
  whoCell.textContent = c.label || '—';
  if (c.email) {
    const lock = document.createElement('span');
    lock.className = 'form-note code-lock';
    lock.textContent = c.email;
    whoCell.appendChild(lock);
  }

  const statusCell = document.createElement('td');
  statusCell.textContent = s.text;
  if (s.spent) statusCell.classList.add('code-spent');

  const actionCell = document.createElement('td');
  if (!s.spent || !c.redeemed_at) {
    const revoke = document.createElement('button');
    revoke.type = 'button';
    revoke.className = 'btn btn-ghost btn-small';
    revoke.innerHTML = '<span>Revoke</span>';
    revoke.addEventListener('click', async () => {
      if (!confirm(`Revoke ${c.code}? Whoever has it will no longer be able to sign up.`)) return;
      revoke.disabled = true;
      try {
        await callAdmin({ action: 'revoke', code: c.code });
        await loadCodes();
      } catch (e) {
        alert(e.message);
        revoke.disabled = false;
      }
    });
    actionCell.appendChild(revoke);
  }

  tr.append(codeCell, siteCell, whoCell, statusCell, actionCell);
  return tr;
}

async function loadCodes() {
  try {
    const { codes } = await callAdmin({ action: 'list' });
    tbody.replaceChildren();
    if (!codes.length) {
      const tr = document.createElement('tr');
      const td = document.createElement('td');
      td.colSpan = 5;
      td.className = 'form-note';
      td.textContent = 'No codes issued yet. Issue one above and send it to the client.';
      tr.appendChild(td);
      tbody.appendChild(tr);
      return;
    }
    codes.forEach((c) => tbody.appendChild(row(c)));
  } catch (e) {
    tbody.replaceChildren();
    const tr = document.createElement('tr');
    const td = document.createElement('td');
    td.colSpan = 5;
    td.className = 'form-note';
    td.textContent = `Could not load codes: ${e.message}`;
    tr.appendChild(td);
    tbody.appendChild(tr);
  }
}

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  status.textContent = '';
  result.hidden = true;
  issueBtn.disabled = true;

  const expires = document.getElementById('expires').value;
  try {
    const { created } = await callAdmin({
      action: 'create',
      site: document.getElementById('site').value,
      label: document.getElementById('label').value.trim() || undefined,
      email: document.getElementById('email').value.trim() || undefined,
      code: document.getElementById('code').value.trim() || undefined,
      // a date input gives a bare day; treat it as end of that day, not 00:00
      expires_at: expires ? new Date(`${expires}T23:59:59`).toISOString() : undefined,
    });
    resultCode.textContent = created.code;
    resultWho.textContent = created.label || created.email || 'them';
    result.hidden = false;
    form.reset();
    await loadCodes();
  } catch (err) {
    status.textContent = err.message;
  }
  issueBtn.disabled = false;
});

copyBtn.addEventListener('click', async () => {
  try {
    await navigator.clipboard.writeText(resultCode.textContent);
    copyBtn.innerHTML = '<span>Copied</span>';
    setTimeout(() => { copyBtn.innerHTML = '<span>Copy</span>'; }, 1600);
  } catch {
    // clipboard is blocked on insecure origins and in some embedded views
    const range = document.createRange();
    range.selectNodeContents(resultCode);
    getSelection().removeAllRanges();
    getSelection().addRange(range);
  }
});

