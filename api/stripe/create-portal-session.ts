import { getAppBaseUrl } from '../_lib/env';
import { createSupabaseAdminClient, requireAuthenticatedUser } from '../_lib/supabase-admin';
import { getStripe } from '../_lib/stripe';

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
      .select('stripe_customer_id,access_source')
      .eq('id', user.id)
      .single();

    if (profileError || !profile?.stripe_customer_id) {
      throw new Error('No paid billing account is attached to this user yet.');
    }

    if (profile.access_source !== 'paid') {
      throw new Error('Billing portal is only available for paid Pro accounts.');
    }

    const session = await stripe.billingPortal.sessions.create({
      customer: profile.stripe_customer_id,
      return_url: `${baseUrl}/app?billing=portal`,
    });

    return Response.json({ url: session.url });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : 'Failed to create billing portal session.' },
      { status: 400 },
    );
  }
}
