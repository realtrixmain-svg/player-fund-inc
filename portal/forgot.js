import { SUPABASE_URL, SITE } from './config.js';

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

  // Per-site reset relay (mirrors signup): the edge function generates the
  // recovery link and sends it through Resend, so the mail carries this portal's
  // own sender name on the shared verified domain. A bare fetch, like signup -
  // the function is deployed with verify_jwt=false.
  try {
    await fetch(`${SUPABASE_URL}/functions/v1/reset-${SITE}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });
  } catch (err) {
    // Network/CORS failures are swallowed into the generic message too - a reset
    // request must never reveal whether the address exists.
    console.warn('reset request failed:', err);
  }

  form.reset();
  status.textContent = GENERIC;
  submitBtn.disabled = false;
  submitBtn.querySelector('span').textContent = 'Send reset link';
});

// only usable once this listener is attached - see button-fallback.js
submitBtn.disabled = false;
