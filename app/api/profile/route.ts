import { NextResponse } from 'next/server';
import { UserRole } from '@/lib/enums/roles';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';
import { ensureUserProfile } from '@/lib/auth/profile-guard';
import { checkUserRateLimit, rateLimitResponse } from '@/lib/rate-limit-service';

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

    const rateLimit = checkUserRateLimit(user.id, 'PROFILE_UPDATE');
    if (!rateLimit.allowed) return rateLimitResponse(rateLimit);

    const body = await request.json();
    const { userId, role, firstName, lastName, agencyName, phone, targetUserId } = body;

    // Validate userId matches token (prevent impersonation)
    if (userId && userId !== user.id) {
      return NextResponse.json({ error: 'Token/user mismatch' }, { status: 403 });
    }

    // Ensure profile exists first (self-healing guard)
    const currentProfile = await ensureUserProfile(user);

    // Determine if this is a self-update or admin updating another user
    const isAdminRequest = currentProfile.role === 'ADMIN';
    const updateTargetId = targetUserId && isAdminRequest ? targetUserId : user.id;
    const isSelfUpdate = updateTargetId === user.id;

    // Build allowed updates for user_metadata (camelCase keys)
    const allowedUpdates: Record<string, unknown> = {};

    // Safe fields anyone can update on themselves
    if (isSelfUpdate) {
      if (firstName !== undefined) allowedUpdates.firstName = firstName;
      if (lastName !== undefined) allowedUpdates.lastName = lastName;
      if (agencyName !== undefined) allowedUpdates.agencyName = agencyName;
      if (phone !== undefined) allowedUpdates.phone = phone;
    }

    // ═══════════════════════════════════════════════════════════════
    // 🔒 SECURITY: Role changes are ADMIN-ONLY
    // ═══════════════════════════════════════════════════════════════
    if (role !== undefined) {
      if (!isAdminRequest) {
        return NextResponse.json(
          { error: 'Role changes require admin privileges' },
          { status: 403 }
        );
      }

      // Validate role is a valid value
      const validRoles: UserRole[] = [
        UserRole.ADMIN,
        UserRole.REPORTER,
        UserRole.SCOPIST,
        UserRole.ATTORNEY,
        UserRole.PARALEGAL,
        UserRole.AGENCY_OWNER,
        UserRole.AGENCY_MANAGER,
        UserRole.VIDEOGRAPHER,
        UserRole.INTERPRETER,
        UserRole.FIRM_OWNER,
        UserRole.FIRM_MANAGER,
        UserRole.SUPER_ADMIN,
        UserRole.COURT_REPORTER,
      ];
      if (!validRoles.includes(role as UserRole)) {
        return NextResponse.json(
          { error: 'Invalid role value' },
          { status: 400 }
        );
      }

      allowedUpdates.role = role;

      // If admin is updating another user, allow name/agency fields too
      if (!isSelfUpdate) {
        if (firstName !== undefined) allowedUpdates.firstName = firstName;
        if (lastName !== undefined) allowedUpdates.lastName = lastName;
        if (agencyName !== undefined) allowedUpdates.agencyName = agencyName;
        if (phone !== undefined) allowedUpdates.phone = phone;
      }
    }

    // Only update if there are changes
    // ⚠️ CRITICAL: Update user_metadata, NOT a users table
    if (Object.keys(allowedUpdates).length > 0) {
      const supabase = getSupabaseAdminClient();

      // Get current user to preserve existing metadata
      const { data: currentUserData, error: getUserError } = await supabase.auth.admin.getUserById(updateTargetId);
      if (getUserError || !currentUserData.user) {
        return NextResponse.json(
          { error: 'User not found' },
          { status: 404 }
        );
      }

      // Build updated metadata (merge with existing)
      const currentMetadata = currentUserData.user.user_metadata || {};
      const updatedMetadata: Record<string, unknown> = {
        ...currentMetadata,
        ...allowedUpdates, // Already in camelCase
      };

      // Update user_metadata via Admin API
      const { data: updatedUserData, error: updateError } = await supabase.auth.admin.updateUserById(
        updateTargetId,
        {
          user_metadata: updatedMetadata,
        }
      );

      if (updateError) {
        console.error('Profile update error:', updateError);
        return NextResponse.json(
          { error: 'Failed to update profile' },
          { status: 500 }
        );
      }

      const updatedUser = updatedUserData.user;
      const profile = {
        id: updatedUser.id,
        email: updatedUser.email || '',
        role: (updatedUser.user_metadata?.role as UserRole) ?? null,
        firstName: updatedUser.user_metadata?.firstName || '',
        lastName: updatedUser.user_metadata?.lastName || '',
        agencyName: updatedUser.user_metadata?.agencyName || null,
        phone: updatedUser.user_metadata?.phone || null,
        createdAt: updatedUser.created_at,
        updatedAt: updatedUser.updated_at || updatedUser.created_at,
      };

      return NextResponse.json({ profile });
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
