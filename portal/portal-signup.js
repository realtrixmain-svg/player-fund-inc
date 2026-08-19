import { supabase } from './supabase-client.js';
import { SITE, SUPABASE_URL } from './config.js';

const form = document.getElementById('signup-form');
const status = document.getElementById('form-status');
const submitBtn = document.getElementById('submit-btn');

// already signed in and verified? skip straight to the dashboard
supabase.auth.getSession().then(({ data }) => {
  if (data.session) window.location.href = 'dashboard.html';
});

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  status.textContent = '';

  const fullName = document.getElementById('full-name').value.trim();
  const email = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value;
  const passwordConfirm = document.getElementById('password-confirm').value;

  if (password !== passwordConfirm) {
    status.textContent = 'Passwords do not match.';
    return;
  }

  submitBtn.disabled = true;

  // Signup goes through a server-side relay (not supabase.auth.signUp directly)
  // so `site` is assigned by the function, using the service-role key, instead
  // of trusting whatever the client claims. See supabase/schema.sql for why.
  try {
    const res = await fetch(`${SUPABASE_URL}/functions/v1/signup-${SITE}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, full_name: fullName || undefined }),
    });
    const body = await res.json().catch(() => ({}));

    if (!res.ok) {
      status.textContent = body.error || `Could not create account (server returned ${res.status}).`;
    } else {
      status.textContent = 'Check your email for a verification link, then sign in.';
      form.reset();
    }
  } catch (err) {
    // fetch() itself only throws on network/CORS/CSP-level failures, which
    // otherwise fail with no visible feedback at all - surface it instead of
    // leaving the button stuck on a silent failure.
    console.error('Signup request failed before reaching the server:', err);
    status.textContent = 'Could not reach the server. Check your connection and try again, or contact us if this keeps happening.';
  } finally {
    submitBtn.disabled = false;
  }
});
