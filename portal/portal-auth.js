import { supabase } from './supabase-client.js';

const form = document.getElementById('auth-form');
const status = document.getElementById('form-status');
const submitBtn = document.getElementById('submit-btn');

// already signed in and verified? skip straight to the dashboard
supabase.auth.getSession().then(({ data }) => {
  if (data.session) window.location.href = 'dashboard.html';
});

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  status.textContent = '';
  const email = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value;
  submitBtn.disabled = true;

  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    status.textContent = error.message.includes('Email not confirmed')
      ? 'Please verify your email first, check your inbox for the confirmation link.'
      : error.message;
  } else {
    // An administrator's password gets them a client session and nothing more:
    // every admin capability is gated on a code emailed to them, redeemed on
    // admin-verify.html. Send them straight there. The redirect is a
    // convenience - if it is skipped, the admin pages and the RLS policies
    // behind them still refuse until that code is redeemed.
    const { data: profile } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', data.user.id)
      .single();
    window.location.href = profile?.is_admin ? 'admin-verify.html' : 'dashboard.html';
  }
  submitBtn.disabled = false;
});

// only usable once this listener is actually attached - see button-fallback.js
// for what happens if this script never gets this far.
submitBtn.disabled = false;
