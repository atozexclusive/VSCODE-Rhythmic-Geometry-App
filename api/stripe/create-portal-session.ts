import { requireAuthenticatedUser } from '../_lib/supabase-admin.js';

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
    await requireAuthenticatedUser(request);
    response.status(400).json({ error: 'One-time Pro purchases do not use a billing portal yet.' });
    return;
  } catch (error) {
    response.status(400).json({
      error: error instanceof Error ? error.message : 'Failed to create billing portal session.',
    });
    return;
  }
}
