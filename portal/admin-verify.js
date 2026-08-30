import { supabase } from './supabase-client.js';
import { callFunction, wireSignOut } from './admin-guard.js';

const sentNote = document.getElementById('sent-note');
const form = document.getElementById('verify-form');
const codeInput = document.getElementById('code');
const verifyBtn = document.getElementById('verify-btn');
const status = document.getElementById('verify-status');
const resendBtn = document.getElementById('resend-btn');

wireSignOut();

async function sendCode() {
  resendBtn.disabled = true;
  try {
    const { sent_to } = await callFunction('admin-verify', { action: 'challenge' });
    sentNote.textContent = `We sent a six-digit sign-in code to ${sent_to}. It expires in 10 minutes.`;
  } catch (e) {
    sentNote.textContent = e.message;
  }
  resendBtn.disabled = false;
}

const { data: { session } } = await supabase.auth.getSession();

// A redirect does not stop the rest of a module running, so everything below the
// first branch has to sit inside the else - reading session.user on the way out
// is how this page threw on its first load.
if (!session) {
  window.location.replace('login.html');
} else {
  const { data: profile } = await supabase
    .from('profiles')
    .select('is_admin')
    .eq('id', session.user.id)
    .single();

  // A client who lands here has nothing to verify: their password sign-in is the
  // whole of their access. Send them where they were going.
  if (!profile?.is_admin) {
    window.location.replace('dashboard.html');
  } else {
    // Already inside the verification window (a refresh, a second tab) - don't
    // make them redeem a second code to get back in.
    try {
      const { verified } = await callFunction('admin-verify', { action: 'status' });
      if (verified) window.location.replace('dashboard.html');
      else await sendCode();
    } catch (e) {
      sentNote.textContent = e.message;
    }

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      status.textContent = '';
      verifyBtn.disabled = true;
      try {
        await callFunction('admin-verify', { action: 'verify', code: codeInput.value });
        window.location.href = 'dashboard.html';
      } catch (err) {
        status.textContent = err.message;
        verifyBtn.disabled = false;
      }
    });

    resendBtn.addEventListener('click', () => {
      status.textContent = '';
      codeInput.value = '';
      sendCode();
    });
  }
}
