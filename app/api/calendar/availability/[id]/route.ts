import { UserRole } from '@/lib/enums/roles';
import { withRouteProtection } from '@/lib/middleware/withRouteProtection';
// =============================================================================
// DELETE AVAILABILITY BLOCK
// app/api/calendar/availability/[id]/route.ts
//
// Phase 3A-2: Delete individual availability slot
// =============================================================================

import type { NextRequest} from 'next/server';
import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/session';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { getUserById } from '@/lib/supabase/queries/users';

interface RouteContext {
  params: Promise<{ id: string }>;
}

async function DELETEHandler(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser?.id || !currentUser.role) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await context.params;
    const supabase = await createSupabaseServerClient();
    const userData = await getUserById(supabase, currentUser.id);
    
    if (!userData?.user_metadata?.firmId) {
      return NextResponse.json({ error: 'User not associated with firm' }, { status: 403 });
    }

    const _user = {
      id: currentUser.id,
      role: currentUser.role,
      firmId: userData.user_metadata?.firmId || userData.user_metadata?.firm_id,
    };

    // Find the availability slot
    const { data: availability, error: availabilityError } = await supabase
      .from('reporter_availability')
      .select('reporter_id, firm_id')
      .eq('id', id)
      .maybeSingle();

    if (availabilityError || !availability) {
      return NextResponse.json({ error: 'Availability not found' }, { status: 404 });
    }

    // Check permissions: Reporters can only delete their own, Admins/Agency can delete any
    if (currentUser.role === 'REPORTER' && availability.reporter_id !== currentUser.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (availability.firm_id !== currentUser.firmId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Delete the availability slot
    const { error: deleteError } = await supabase
      .from('reporter_availability')
      .delete()
      .eq('id', id);

    if (deleteError) {
      throw deleteError;
    }

    return NextResponse.json({
      message: 'Availability deleted successfully',
    });
  } catch (error) {
    console.error('Availability DELETE error:', error);
    return NextResponse.json(
      { error: 'Failed to delete availability' },
      { status: 500 }
    );
  }
}

export const DELETE = withRouteProtection(
  { requireAuth: true, requireRole: [UserRole.ADMIN, UserRole.COURT_REPORTER, UserRole.SCOPIST] },
  DELETEHandler as any
);

