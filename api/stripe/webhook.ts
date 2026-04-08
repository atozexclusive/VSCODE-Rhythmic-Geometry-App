import type Stripe from 'stripe';
import { getRequestHeader, getRequestText } from '../_lib/env.js';
import { createSupabaseAdminClient } from '../_lib/supabase-admin.js';
import { getStripe, getStripeWebhookSecret } from '../_lib/stripe.js';

export const config = {
  runtime: 'nodejs',
};

type ApiResponse = {
  status: (code: number) => ApiResponse;
  json: (body: unknown) => void;
};

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
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

  const { error } = await supabaseAdmin
    .from('users')
    .update(updatePayload)
    .eq('id', userId);

  if (error) {
    throw error;
  }
}

export default async function handler(request: Request, response: ApiResponse) {
  if (request.method !== 'POST') {
    response.status(405).json({ error: 'Method not allowed.' });
    return;
  }

  try {
    const stripe = getStripe();
    const signature = getRequestHeader(request, 'stripe-signature');
    if (!signature) {
      throw new Error('Missing stripe-signature header.');
    }

    const body = await getRequestText(request);
    const event = await stripe.webhooks.constructEventAsync(body, signature, getStripeWebhookSecret());

    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session);
        break;
      default:
        break;
    }

    response.status(200).json({ received: true });
    return;
  } catch (error) {
    response.status(400).json({
      error: error instanceof Error ? error.message : 'Webhook processing failed.',
    });
    return;
  }
}
