import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { UserRole } from '@prisma/client';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';
import { ensureUserProfile } from '@/lib/auth/profile-guard';

/**
 * GET /api/profile
 * Get current user's profile
 */
export async function GET(request: Request) {
  try {
    const token = extractToken(request);
    if (!token) {
      return NextResponse.json({ error: 'Missing access token' }, { status: 401 });
    }

    const { user, error } = await validateToken(token);
    if (error || !user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    // Ensure profile exists and return it
    const profile = await ensureUserProfile(user);
    return NextResponse.json({ profile });
  } catch (error) {
    console.error('Profile GET error:', error);
    return NextResponse.json({ error: 'Failed to get profile' }, { status: 500 });
  }
}

/**
 * POST /api/profile
 * Create or update user profile
 * ⚠️ SECURITY: Role updates require ADMIN privilege
 */
export async function POST(request: Request) {
  try {
    const token = extractToken(request);
    if (!token) {
      return NextResponse.json({ error: 'Missing access token' }, { status: 401 });
    }

    const { user, error } = await validateToken(token);
    if (error || !user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const body = await request.json();
    const { userId, role, firstName, lastName, agencyName, phone, targetUserId } = body;

    // Validate userId matches token (prevent impersonation)
    if (userId && userId !== user.id) {
      return NextResponse.json({ error: 'Token/user mismatch' }, { status: 403 });
    }

    // Ensure profile exists first (self-healing guard)
    const currentProfile = await ensureUserProfile(user);

    // Determine if this is a self-update or admin updating another user
    const isAdminRequest = currentProfile.role === UserRole.ADMIN;
    const updateTargetId = targetUserId && isAdminRequest ? targetUserId : user.id;
    const isSelfUpdate = updateTargetId === user.id;

    // Build allowed updates
    const allowedUpdates: Record<string, unknown> = {};

    // Safe fields anyone can update on themselves
    if (isSelfUpdate) {
      if (firstName) allowedUpdates.firstName = firstName;
      if (lastName) allowedUpdates.lastName = lastName;
      if (agencyName !== undefined) allowedUpdates.agencyName = agencyName;
      if (phone !== undefined) allowedUpdates.phone = phone;
    }

    // ═══════════════════════════════════════════════════════════════
    // 🔒 SECURITY: Role changes are ADMIN-ONLY
    // ═══════════════════════════════════════════════════════════════
    if (role) {
      if (!isAdminRequest) {
        return NextResponse.json(
          { error: 'Role changes require admin privileges' },
          { status: 403 }
        );
      }

      // Validate role is a valid enum value
      if (!Object.values(UserRole).includes(role)) {
        return NextResponse.json(
          { error: 'Invalid role value' },
          { status: 400 }
        );
      }

      allowedUpdates.role = role;

      // If admin is updating another user, allow name/agency fields too
      if (!isSelfUpdate) {
        if (firstName) allowedUpdates.firstName = firstName;
        if (lastName) allowedUpdates.lastName = lastName;
        if (agencyName !== undefined) allowedUpdates.agencyName = agencyName;
        if (phone !== undefined) allowedUpdates.phone = phone;
      }
    }

    // Only update if there are changes
    if (Object.keys(allowedUpdates).length > 0) {
      const updated = await db.user.update({
        where: { id: updateTargetId },
        data: allowedUpdates,
        select: {
          id: true,
          email: true,
          role: true,
          firstName: true,
          lastName: true,
          agencyName: true,
          phone: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      return NextResponse.json({ profile: updated });
    }

    return NextResponse.json({ profile: currentProfile });
  } catch (error) {
    console.error('Profile POST error:', error);
    return NextResponse.json({ error: 'Failed to update profile' }, { status: 500 });
  }
}

// ═══════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════

function extractToken(request: Request): string | null {
  const authHeader = request.headers.get('authorization');
  if (authHeader?.toLowerCase().startsWith('bearer ')) {
    return authHeader.slice(7).trim();
  }
  return null;
}

async function validateToken(token: string) {
  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase.auth.getUser(token);
  return { user: data?.user, error };
}
