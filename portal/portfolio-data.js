import { supabase } from './supabase-client.js';

const signOutBtn = document.getElementById('sign-out');

const { data: { session } } = await supabase.auth.getSession();
if (!session) {
  window.location.href = 'login.html';
}

signOutBtn.addEventListener('click', async () => {
  await supabase.auth.signOut();
  window.location.href = 'login.html';
});
