import { requireAuthenticatedUser } from '../_lib/supabase-admin.js';

export const config = {
  runtime: 'nodejs',
};

export default async function handler(request: Request) {
  if (request.method !== 'POST') {
    return Response.json({ error: 'Method not allowed.' }, { status: 405 });
  }

  try {
    await requireAuthenticatedUser(request);
    return Response.json(
      { error: 'One-time Pro purchases do not use a billing portal yet.' },
      { status: 400 },
    );
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : 'Failed to create billing portal session.' },
      { status: 400 },
    );
  }
}
