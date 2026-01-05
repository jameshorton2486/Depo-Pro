import { cookies } from 'next/headers';
import type { NextRequest } from 'next/server';
import { createSupabaseServiceClient } from './server';

// Extract access token from Supabase auth cookies or Authorization header (Bearer).
const getAccessToken = async (request: NextRequest): Promise<string | undefined> => {
  const authHeader = request.headers.get('authorization');
  if (authHeader?.toLowerCase().startsWith('bearer ')) {
    return authHeader.slice(7).trim();
  }

  const cookieStore = await cookies();
  return cookieStore.get('sb-access-token')?.value;
};

// Lightweight helper to fetch the current user in middleware/edge contexts.
export const getSupabaseUserFromRequest = async (request: NextRequest) => {
  const accessToken = await getAccessToken(request);
  if (!accessToken) return { user: null, error: 'missing_token' as const };

  const supabase = createSupabaseServiceClient();
  // Auth admin API lets us retrieve user by access token.
  const { data, error } = await supabase.auth.getUser(accessToken);
  if (error) return { user: null, error: error.message };
  return { user: data.user, error: null };
};
