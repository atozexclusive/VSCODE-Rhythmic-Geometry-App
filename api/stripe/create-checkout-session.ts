import { getAppBaseUrl } from '../_lib/env';
import { createSupabaseAdminClient, requireAuthenticatedUser } from '../_lib/supabase-admin';
import { getStripe, getStripePriceId } from '../_lib/stripe';

export const config = {
  runtime: 'nodejs',
};

export default async function handler(request: Request) {
  if (request.method !== 'POST') {
    return Response.json({ error: 'Method not allowed.' }, { status: 405 });
  }

  try {
    const user = await requireAuthenticatedUser(request);
    const supabaseAdmin = createSupabaseAdminClient();
    const stripe = getStripe();
    const baseUrl = getAppBaseUrl(request);

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

    let stripeCustomerId = profile.stripe_customer_id as string | null;

    if (!stripeCustomerId) {
      const customer = await stripe.customers.create({
        email: profile.email,
        metadata: {
          user_id: user.id,
        },
      });
      stripeCustomerId = customer.id;

      const { error: updateCustomerError } = await supabaseAdmin
        .from('users')
        .update({ stripe_customer_id: stripeCustomerId })
        .eq('id', user.id);

      if (updateCustomerError) {
        throw new Error(`Failed to store Stripe customer: ${updateCustomerError.message}`);
      }
    }

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

    return Response.json({ url: session.url });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : 'Failed to create checkout session.' },
      { status: 400 },
    );
  }
}
