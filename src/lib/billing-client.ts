import { supabase } from './supabase';

async function getAccessToken() {
  if (!supabase) {
    throw new Error('Supabase auth is not configured.');
  }

  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.access_token) {
    throw new Error('Sign in first to manage Pro access.');
  }

  return session.access_token;
}

async function postBillingRequest(path: string) {
  const accessToken = await getAccessToken();
  const response = await fetch(path, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  const payload = (await response.json().catch(() => ({}))) as { error?: string; url?: string };
  if (!response.ok || !payload.url) {
    throw new Error(payload.error || 'Billing request failed.');
  }

  return payload.url;
}

export async function startStripeCheckout() {
  const url = await postBillingRequest('/api/stripe/create-checkout-session');
  window.location.assign(url);
}

export async function openStripeBillingPortal() {
  const url = await postBillingRequest('/api/stripe/create-portal-session');
  window.location.assign(url);
}
