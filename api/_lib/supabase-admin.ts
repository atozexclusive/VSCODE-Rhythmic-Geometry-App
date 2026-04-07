import { createClient } from '@supabase/supabase-js';
import { requireServerEnv } from './env';

const supabaseUrl = process.env.VITE_SUPABASE_URL?.trim() || process.env.SUPABASE_URL?.trim();
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY?.trim() || process.env.SUPABASE_ANON_KEY?.trim();

function createSupabaseAuthClient() {
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Supabase public env vars are missing on the server.');
  }

  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

export function createSupabaseAdminClient() {
  if (!supabaseUrl) {
    throw new Error('Supabase URL is missing on the server.');
  }

  return createClient(supabaseUrl, requireServerEnv('SUPABASE_SERVICE_ROLE_KEY'), {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

export async function requireAuthenticatedUser(request: Request) {
  const authorization = request.headers.get('authorization');
  if (!authorization?.startsWith('Bearer ')) {
    throw new Error('Missing bearer token.');
  }

  const accessToken = authorization.slice('Bearer '.length);
  const authClient = createSupabaseAuthClient();
  const { data, error } = await authClient.auth.getUser(accessToken);

  if (error || !data.user) {
    throw new Error('Invalid session.');
  }

  return data.user;
}
