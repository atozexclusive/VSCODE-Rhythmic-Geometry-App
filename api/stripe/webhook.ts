import type Stripe from 'stripe';
import { createSupabaseAdminClient } from '../_lib/supabase-admin';
import { getStripe, getStripeWebhookSecret, subscriptionStatusGrantsPro } from '../_lib/stripe';

export const config = {
  runtime: 'nodejs',
};

async function updateUserPlanFromSubscription(subscription: Stripe.Subscription) {
  const supabaseAdmin = createSupabaseAdminClient();
  const customerId = typeof subscription.customer === 'string' ? subscription.customer : subscription.customer.id;
  const priceId = subscription.items.data[0]?.price?.id ?? null;
  const isPro = subscriptionStatusGrantsPro(subscription.status);

  const plan = isPro ? 'pro' : 'free';
  const accessSource = isPro ? 'paid' : 'none';

  const { error } = await supabaseAdmin
    .from('users')
    .update({
      plan,
      comped: false,
      access_source: accessSource,
      stripe_customer_id: customerId,
      stripe_subscription_id: subscription.id,
      stripe_price_id: priceId,
    })
    .eq('stripe_customer_id', customerId);

  if (error) {
    throw error;
  }
}

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  const userId = session.metadata?.user_id ?? session.client_reference_id;
  const customerId = typeof session.customer === 'string' ? session.customer : session.customer?.id ?? null;
  const subscriptionId =
    typeof session.subscription === 'string' ? session.subscription : session.subscription?.id ?? null;

  if (!userId) {
    throw new Error('Checkout session did not include a user id.');
  }

  const supabaseAdmin = createSupabaseAdminClient();
  const updatePayload: Record<string, string | boolean | null> = {
    plan: 'pro',
    comped: false,
    access_source: 'paid',
    stripe_customer_id: customerId,
    stripe_subscription_id: subscriptionId,
  };

  const { error } = await supabaseAdmin
    .from('users')
    .update(updatePayload)
    .eq('id', userId);

  if (error) {
    throw error;
  }
}

export default async function handler(request: Request) {
  if (request.method !== 'POST') {
    return Response.json({ error: 'Method not allowed.' }, { status: 405 });
  }

  try {
    const stripe = getStripe();
    const signature = request.headers.get('stripe-signature');
    if (!signature) {
      throw new Error('Missing stripe-signature header.');
    }

    const body = await request.text();
    const event = await stripe.webhooks.constructEventAsync(body, signature, getStripeWebhookSecret());

    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session);
        break;
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted':
        await updateUserPlanFromSubscription(event.data.object as Stripe.Subscription);
        break;
      default:
        break;
    }

    return Response.json({ received: true });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : 'Webhook processing failed.' },
      { status: 400 },
    );
  }
}
