import type { NextRequest } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getCurrentUser } from '@/lib/auth/session';

export async function licensingUserId(request: NextRequest): Promise<string|null> {
  const header = request.headers.get('authorization');
  if (header?.startsWith('Bearer ')) {
    const { data, error } = await createAdminClient().auth.getUser(header.slice(7));
    return error ? null : data.user?.id ?? null;
  }
  return (await getCurrentUser())?.id ?? null;
}
