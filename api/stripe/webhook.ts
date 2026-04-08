import type Stripe from 'stripe';
import { getRequestHeader, getRequestText } from '../_lib/env.js';
import { applyPaidCheckoutSession } from '../_lib/stripe-entitlements.js';
import { getStripe, getStripeWebhookSecret } from '../_lib/stripe.js';

export const config = {
  runtime: 'nodejs',
};

type ApiResponse = {
  status: (code: number) => ApiResponse;
  json: (body: unknown) => void;
};

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
        await applyPaidCheckoutSession(event.data.object as Stripe.Checkout.Session);
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
