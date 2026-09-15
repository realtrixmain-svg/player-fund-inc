import { supabase } from './supabase-client.js';

const form = document.getElementById('auth-form');
const status = document.getElementById('form-status');
const submitBtn = document.getElementById('submit-btn');

// Same generic line whether or not the address has an account, so this page
// can't be used to probe which emails are registered.
const GENERIC = "If that address has an account, we've sent a reset link.";

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  status.textContent = '';
  const email = document.getElementById('email').value.trim();
  if (!email) { status.textContent = 'Enter your email address.'; return; }

  submitBtn.disabled = true;
  submitBtn.querySelector('span').textContent = 'Sending...';

  // Recovery link lands back on reset.html next to this page.
  const redirectTo = new URL('reset.html', window.location.href).href;
  // Result is deliberately ignored for the user-facing message; a real error is
  // logged for us but never surfaced, to avoid leaking whether the email exists.
  const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });
  if (error) console.warn('resetPasswordForEmail:', error.message);

  form.reset();
  status.textContent = GENERIC;
  submitBtn.disabled = false;
  submitBtn.querySelector('span').textContent = 'Send reset link';
});

// only usable once this listener is attached - see button-fallback.js
submitBtn.disabled = false;
