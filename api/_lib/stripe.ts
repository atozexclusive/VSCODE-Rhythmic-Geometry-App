import Stripe from 'stripe';
import { requireServerEnv } from './env';

let stripeClient: Stripe | null = null;

export function getStripe() {
  if (!stripeClient) {
    stripeClient = new Stripe(requireServerEnv('STRIPE_SECRET_KEY'));
  }

  return stripeClient;
}

export function getStripePriceId() {
  return requireServerEnv('STRIPE_PRICE_ID_PRO');
}

export function getStripeWebhookSecret() {
  return requireServerEnv('STRIPE_WEBHOOK_SECRET');
}

export function subscriptionStatusGrantsPro(status: Stripe.Subscription.Status) {
  return status === 'active' || status === 'trialing' || status === 'past_due';
}
