import { supabase } from './supabase-client.js';
import { SITE } from './config.js';

const form = document.getElementById('auth-form');
const status = document.getElementById('form-status');
const submitBtn = document.getElementById('submit-btn');
const toggleBtn = document.getElementById('toggle-mode');
const title = document.getElementById('portal-title');

let mode = 'signin';

// already signed in and verified? skip straight to the dashboard
supabase.auth.getSession().then(({ data }) => {
  if (data.session) window.location.href = 'dashboard.html';
});

toggleBtn.addEventListener('click', () => {
  mode = mode === 'signin' ? 'signup' : 'signin';
  const isSignup = mode === 'signup';
  title.textContent = isSignup ? 'Create your account' : 'Sign in';
  submitBtn.querySelector('span').textContent = isSignup ? 'Sign up' : 'Sign in';
  toggleBtn.textContent = isSignup ? 'Already have an account? Sign in' : 'Need an account? Sign up';
  status.textContent = '';
});

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  status.textContent = '';
  const email = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value;
  submitBtn.disabled = true;

  if (mode === 'signup') {
    const { error } = await supabase.auth.signUp({ email, password, options: { data: { site: SITE } } });
    if (error) {
      status.textContent = error.message;
    } else {
      status.textContent = 'Check your email for a verification link, then sign in.';
      mode = 'signin';
      title.textContent = 'Sign in';
      submitBtn.querySelector('span').textContent = 'Sign in';
      toggleBtn.textContent = 'Need an account? Sign up';
    }
  } else {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      status.textContent = error.message.includes('Email not confirmed')
        ? 'Please verify your email first, check your inbox for the confirmation link.'
        : error.message;
    } else {
      window.location.href = 'dashboard.html';
    }
  }
  submitBtn.disabled = false;
});
