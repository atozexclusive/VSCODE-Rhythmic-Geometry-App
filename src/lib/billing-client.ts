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

async function postBillingRequest(path: string, body?: Record<string, unknown>) {
  const accessToken = await getAccessToken();
  const response = await fetch(path, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });

  const rawBody = await response.text();
  let payload: { error?: string; url?: string } = {};

  if (rawBody) {
    try {
      payload = JSON.parse(rawBody) as { error?: string; url?: string };
    } catch {
      payload = {};
    }
  }

  if (!response.ok || !payload.url) {
    const plainTextError = rawBody.trim().replace(/\s+/g, ' ').slice(0, 220);
    throw new Error(
      payload.error ||
        (plainTextError && !plainTextError.startsWith('<!doctype') && !plainTextError.startsWith('<html')
          ? plainTextError
          : '') ||
        `Billing request failed (${response.status}).`,
    );
  }

  return payload.url;
}

async function postBillingJsonRequest(path: string, body?: Record<string, unknown>) {
  const accessToken = await getAccessToken();
  const response = await fetch(path, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });

  const rawBody = await response.text();
  let payload: { error?: string; ok?: boolean } = {};

  if (rawBody) {
    try {
      payload = JSON.parse(rawBody) as { error?: string; ok?: boolean };
    } catch {
      payload = {};
    }
  }

  if (!response.ok) {
    const plainTextError = rawBody.trim().replace(/\s+/g, ' ').slice(0, 220);
    throw new Error(
      payload.error ||
        (plainTextError && !plainTextError.startsWith('<!doctype') && !plainTextError.startsWith('<html')
          ? plainTextError
          : '') ||
        `Billing request failed (${response.status}).`,
    );
  }

  return payload;
}

export async function startStripeCheckout() {
  const url = await postBillingRequest('/api/stripe/create-checkout-session');
  window.location.assign(url);
}

export async function confirmStripeCheckout(sessionId: string) {
  await postBillingJsonRequest('/api/stripe/confirm-checkout-session', { sessionId });
}

export async function openStripeBillingPortal() {
  const url = await postBillingRequest('/api/stripe/create-portal-session');
  window.location.assign(url);
}
