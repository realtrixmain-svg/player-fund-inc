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
  const res = await fetch(`${SUPABASE_URL}/functions/v1/signup-${SITE}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, full_name: fullName || undefined }),
  });
  const body = await res.json().catch(() => ({}));

  if (!res.ok) {
    status.textContent = body.error || 'Could not create account.';
    submitBtn.disabled = false;
  } else {
    status.textContent = 'Check your email for a verification link, then sign in.';
    form.reset();
    submitBtn.disabled = false;
  }
});
