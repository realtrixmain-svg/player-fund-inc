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

  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    status.textContent = error.message.includes('Email not confirmed')
      ? 'Please verify your email first, check your inbox for the confirmation link.'
      : error.message;
  } else {
    window.location.href = 'dashboard.html';
  }
  submitBtn.disabled = false;
});
