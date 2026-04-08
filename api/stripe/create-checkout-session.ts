import { getAppBaseUrl } from '../_lib/env.js';
import { createSupabaseAdminClient, requireAuthenticatedUser } from '../_lib/supabase-admin.js';
import { getStripe, getStripePriceId } from '../_lib/stripe.js';

export const config = {
  runtime: 'nodejs',
};

export default async function handler(request: Request) {
  if (request.method !== 'POST') {
    return Response.json({ error: 'Method not allowed.' }, { status: 405 });
  }

  try {
    console.log('[stripe-checkout] begin');
    const user = await requireAuthenticatedUser(request);
    console.log('[stripe-checkout] authenticated user', user.id);
    const supabaseAdmin = createSupabaseAdminClient();
    console.log('[stripe-checkout] supabase admin client ready');
    const stripe = getStripe();
    console.log('[stripe-checkout] stripe client ready');
    const baseUrl = getAppBaseUrl(request);
    console.log('[stripe-checkout] base url', baseUrl);

    console.log('[stripe-checkout] loading user profile');
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('users')
      .select('id,email,stripe_customer_id')
      .eq('id', user.id)
      .single();

    if (profileError) {
      throw new Error(`User profile lookup failed: ${profileError.message}`);
    }

    if (!profile) {
      throw new Error('User profile not found.');
    }

    console.log('[stripe-checkout] user profile loaded', {
      userId: profile.id,
      hasEmail: Boolean(profile.email),
      hasStripeCustomerId: Boolean(profile.stripe_customer_id),
    });

    let stripeCustomerId = profile.stripe_customer_id as string | null;

    if (!stripeCustomerId) {
      console.log('[stripe-checkout] creating stripe customer');
      const customer = await stripe.customers.create({
        email: profile.email,
        metadata: {
          user_id: user.id,
        },
      });
      stripeCustomerId = customer.id;
      console.log('[stripe-checkout] stripe customer created', stripeCustomerId);

      console.log('[stripe-checkout] saving stripe customer id');
      const { error: updateCustomerError } = await supabaseAdmin
        .from('users')
        .update({ stripe_customer_id: stripeCustomerId })
        .eq('id', user.id);

      if (updateCustomerError) {
        throw new Error(`Failed to store Stripe customer: ${updateCustomerError.message}`);
      }

      console.log('[stripe-checkout] stripe customer id saved');
    }

    console.log('[stripe-checkout] creating checkout session');
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      customer: stripeCustomerId,
      client_reference_id: user.id,
      allow_promotion_codes: true,
      line_items: [
        {
          price: getStripePriceId(),
          quantity: 1,
        },
      ],
      metadata: {
        user_id: user.id,
        price_id: getStripePriceId(),
      },
      success_url: `${baseUrl}/app?checkout=success`,
      cancel_url: `${baseUrl}/app?checkout=canceled`,
    });

    if (!session.url) {
      throw new Error('Stripe did not return a checkout URL.');
    }

    console.log('[stripe-checkout] checkout session ready');

    return Response.json({ url: session.url });
  } catch (error) {
    console.error('[stripe-checkout] failed', error);
    return Response.json(
      { error: error instanceof Error ? error.message : 'Failed to create checkout session.' },
      { status: 400 },
    );
  }
}
