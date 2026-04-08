import { getRequestText } from '../_lib/env.js';
import { requireAuthenticatedUser } from '../_lib/supabase-admin.js';
import { applyPaidCheckoutSession } from '../_lib/stripe-entitlements.js';
import { getStripe } from '../_lib/stripe.js';

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
    const user = await requireAuthenticatedUser(request);
    const rawBody = await getRequestText(request);
    const payload = rawBody ? (JSON.parse(rawBody) as { sessionId?: string }) : {};
    const sessionId = payload.sessionId?.trim();

    if (!sessionId) {
      throw new Error('Missing checkout session id.');
    }

    const stripe = getStripe();
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    const sessionUserId = session.metadata?.user_id ?? session.client_reference_id;

    if (sessionUserId !== user.id) {
      throw new Error('Checkout session does not belong to the signed-in user.');
    }

    await applyPaidCheckoutSession(session);

    response.status(200).json({ ok: true });
    return;
  } catch (error) {
    response.status(400).json({
      error: error instanceof Error ? error.message : 'Could not confirm checkout.',
    });
    return;
  }
}
