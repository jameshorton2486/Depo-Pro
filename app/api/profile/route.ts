import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { Role } from '@/lib/constants';
import { createSupabaseServiceClient } from '@/utils/supabase/server';
import { ensureUserProfile } from '@/lib/auth/profile-guard';

/**
 * POST /api/profile
 * Create or update user profile from Supabase auth user
 * 
 * This endpoint ensures that every authenticated Supabase user
 * has a corresponding profile in the public."User" table.
 */
export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.toLowerCase().startsWith('bearer ')
      ? authHeader.slice(7).trim()
      : null;

    if (!token) {
      return NextResponse.json({ error: 'Missing access token' }, { status: 401 });
    }

    const supabase = createSupabaseServiceClient();
    const { data: userResult, error: userError } = await supabase.auth.getUser(token);
    if (userError || !userResult.user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const body = await request.json();
    const { userId, email, role, firstName, lastName, agencyName } = body;

    if (!userId || !email) {
      return NextResponse.json({ error: 'userId and email are required' }, { status: 400 });
    }

    if (userId !== userResult.user.id) {
      return NextResponse.json({ error: 'Token/user mismatch' }, { status: 403 });
    }

    // Ensure profile exists (self-healing guard)
    const profile = await ensureUserProfile(userResult.user);

    // Update additional fields if provided
    if (firstName || lastName || agencyName || role) {
      const updated = await db.user.update({
        where: { id: userId },
        data: {
          ...(firstName && { firstName }),
          ...(lastName && { lastName }),
          ...(agencyName !== undefined && { agencyName }),
          ...(role && { role: role as Role }),
        },
        select: {
          id: true,
          email: true,
          role: true,
          firstName: true,
          lastName: true,
          agencyName: true,
        },
      });

      return NextResponse.json({ profile: updated });
    }

    return NextResponse.json({ profile });
  } catch (_error) {
    console.error('Profile creation/update failed:', _error);
    return NextResponse.json({ error: 'Failed to create profile' }, { status: 500 });
  }
}
