import type Stripe from 'stripe';
import { createSupabaseAdminClient } from './supabase-admin.js';

export async function applyPaidCheckoutSession(session: Stripe.Checkout.Session) {
  const userId = session.metadata?.user_id ?? session.client_reference_id;
  const customerId = typeof session.customer === 'string' ? session.customer : session.customer?.id ?? null;
  const subscriptionId =
    typeof session.subscription === 'string' ? session.subscription : session.subscription?.id ?? null;
  const paymentStatus = session.payment_status ?? null;
  const priceId = session.metadata?.price_id ?? null;

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
}
