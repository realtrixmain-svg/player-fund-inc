// Shared front door for every administrator page.
//
// None of this is the security boundary - public.is_verified_admin() in RLS and
// the step-up check inside the edge functions are. This only decides what to
// render, so an admin who has not yet redeemed their emailed code gets sent to
// the code screen instead of a page full of failing requests.
import { supabase } from './supabase-client.js';

// supabase.functions.invoke() flattens any non-2xx into a generic
// FunctionsHttpError, so dig the real message out of the response body first.
export async function callFunction(name, body) {
  const { data, error } = await supabase.functions.invoke(name, { body });
  if (error) {
    let message = error.message;
    let status = error.context?.status;
    let payload = null;
    try { payload = await error.context.json(); } catch { /* keep fallback */ }
    if (payload?.error) message = payload.error;
    const wrapped = new Error(message);
    wrapped.status = status;
    wrapped.stepUpRequired = !!payload?.step_up_required;
    throw wrapped;
  }
  if (data?.error) throw new Error(data.error);
  return data;
}

export async function requireVerifiedAdmin() {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    window.location.replace('login.html');
    return null;
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('is_admin')
    .eq('id', session.user.id)
    .single();

  if (!profile?.is_admin) {
    window.location.replace('dashboard.html');
    return null;
  }

  try {
    const { verified } = await callFunction('admin-verify', { action: 'status' });
    if (!verified) {
      window.location.replace('admin-verify.html');
      return null;
    }
  } catch {
    window.location.replace('admin-verify.html');
    return null;
  }

  return session;
}

// Ending the admin window explicitly matters more than ending the Supabase
// session does: the auth session is per-browser, but admin_sessions is a
// server-side grant that would otherwise stay open for its full 12 hours after
// the admin walks away from a shared machine.
export async function signOut() {
  try { await supabase.functions.invoke('admin-verify', { body: { action: 'end' } }); } catch { /* sign out regardless */ }
  await supabase.auth.signOut();
  window.location.href = 'login.html';
}

export function wireSignOut(id = 'sign-out') {
  document.getElementById(id)?.addEventListener('click', signOut);
}
