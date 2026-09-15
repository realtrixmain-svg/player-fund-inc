import { supabase } from './supabase-client.js';

const form = document.getElementById('auth-form');
const status = document.getElementById('form-status');
const submitBtn = document.getElementById('submit-btn');
const pw = document.getElementById('password');
const pw2 = document.getElementById('password2');

// The recovery link carries a one-time session in the URL; supabase-js restores
// it (detectSessionInUrl is on by default) and fires an auth event. The form is
// only usable once that session exists.
let ready = false;
function markReady() {
  if (ready) return;
  ready = true;
  submitBtn.disabled = false;
}

supabase.auth.onAuthStateChange((_event, session) => {
  if (session) markReady();
});

const { data } = await supabase.auth.getSession();
if (data.session) {
  markReady();
} else {
  // Give detectSessionInUrl a moment; if there's still no session the link is
  // stale or was opened directly.
  setTimeout(async () => {
    if (ready) return;
    const { data: again } = await supabase.auth.getSession();
    if (again.session) markReady();
    else status.textContent = 'This reset link is invalid or has expired. Request a new one from the sign-in page.';
  }, 1500);
}

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  status.textContent = '';
  const p1 = pw.value;
  const p2 = pw2.value;
  if (p1.length < 8) { status.textContent = 'Use at least 8 characters.'; return; }
  if (p1 !== p2) { status.textContent = 'Those passwords do not match.'; return; }

  submitBtn.disabled = true;
  submitBtn.querySelector('span').textContent = 'Updating...';

  const { error } = await supabase.auth.updateUser({ password: p1 });
  if (error) {
    status.textContent = error.message;
    submitBtn.disabled = false;
    submitBtn.querySelector('span').textContent = 'Update password';
    return;
  }

  // Password changed: revoke every session (this recovery one included) so a
  // stolen link can't be reused and any other logged-in device is dropped, then
  // make them sign in fresh. This deliberately does NOT touch the admin step-up
  // (admin-verify) - that emailed-code gate stays required on its own.
  await supabase.auth.signOut();
  status.textContent = 'Password updated. Redirecting to sign in.';
  setTimeout(() => { window.location.href = 'login.html'; }, 1200);
});
