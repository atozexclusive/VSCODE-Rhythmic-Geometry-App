import type Stripe from 'stripe';
import { createSupabaseAdminClient } from './supabase-admin.js';

export async function applyPaidCheckoutSession(session: Stripe.Checkout.Session) {
  const userId = session.metadata?.user_id ?? session.client_reference_id;
  const customerId = typeof session.customer === 'string' ? session.customer : session.customer?.id ?? null;
  const subscriptionId =
    typeof session.subscription === 'string' ? session.subscription : session.subscription?.id ?? null;
  const paymentStatus = session.payment_status ?? null;
  const priceId = session.metadata?.price_id ?? null;
  const paymentIntentId =
    typeof session.payment_intent === 'string' ? session.payment_intent : session.payment_intent?.id ?? null;

  if (!userId) {
    throw new Error('Checkout session did not include a user id.');
  }

  if (paymentStatus && paymentStatus !== 'paid' && paymentStatus !== 'no_payment_required') {
    throw new Error(`Checkout completed without a paid status: ${paymentStatus}`);
  }

  const supabaseAdmin = createSupabaseAdminClient();
  const updatePayload: Record<string, string | boolean | null> = {
    plan: 'pro',
    comped: false,
    access_source: 'paid',
    stripe_customer_id: customerId,
    stripe_subscription_id: subscriptionId,
    stripe_price_id: priceId,
  };

  const { error } = await supabaseAdmin.from('users').update(updatePayload).eq('id', userId);

  if (error) {
    throw error;
  }

  if (paymentIntentId) {
    const { error: paymentIntentError } = await supabaseAdmin
      .from('users')
      .update({ stripe_payment_intent_id: paymentIntentId })
      .eq('id', userId);

    if (paymentIntentError) {
      console.warn('[stripe-entitlements] could not store payment intent id', paymentIntentError);
    }
  }
}

export async function revokePaidCheckoutSession(session: Stripe.Checkout.Session) {
  const userId = session.metadata?.user_id ?? session.client_reference_id;
  const customerId = typeof session.customer === 'string' ? session.customer : session.customer?.id ?? null;

  if (!userId && !customerId) {
    throw new Error('Refunded checkout session did not include a user or customer id.');
  }

  const supabaseAdmin = createSupabaseAdminClient();
  let query = supabaseAdmin
    .from('users')
    .update({
      plan: 'free',
      comped: false,
      access_source: 'none',
      stripe_subscription_id: null,
      stripe_price_id: null,
      stripe_payment_intent_id: null,
    })
    .eq('access_source', 'paid');

  query = userId ? query.eq('id', userId) : query.eq('stripe_customer_id', customerId);

  const { error } = await query;

  if (error) {
    throw error;
  }
}

export async function revokePaidCheckoutByPaymentIntent(paymentIntentId: string) {
  const supabaseAdmin = createSupabaseAdminClient();
  const { error } = await supabaseAdmin
    .from('users')
    .update({
      plan: 'free',
      comped: false,
      access_source: 'none',
      stripe_subscription_id: null,
      stripe_price_id: null,
      stripe_payment_intent_id: null,
    })
    .eq('access_source', 'paid')
    .eq('stripe_payment_intent_id', paymentIntentId);

  if (error) {
    throw error;
  }
}

export async function revokePaidCheckoutByCustomer(customerId: string) {
  const supabaseAdmin = createSupabaseAdminClient();
  const { error } = await supabaseAdmin
    .from('users')
    .update({
      plan: 'free',
      comped: false,
      access_source: 'none',
      stripe_subscription_id: null,
      stripe_price_id: null,
      stripe_payment_intent_id: null,
    })
    .eq('access_source', 'paid')
    .eq('stripe_customer_id', customerId);

  if (error) {
    throw error;
  }
}
