// ============================================================
// SCHEDULING SUGGESTIONS API
// File: app/api/calendar/suggestions/route.ts
// ============================================================

import type { NextRequest} from 'next/server';
import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { getUserById } from '@/lib/supabase/queries/users';
import { FEATURES } from '@/lib/feature-flags';
import { UserRole } from '@/lib/enums/roles';
import { z } from 'zod';

// ============================================================
// VALIDATION SCHEMAS
// ============================================================

const getSuggestionsSchema = z.object({
  eventType: z.string().optional(),
  requestedStart: z.string().datetime().optional(),
  requestedEnd: z.string().datetime().optional(),
  requestedReporterId: z.string().optional(),
  location: z.string().optional(),
  isRemote: z.boolean().optional(),
  estimatedDuration: z.number().optional(),
});

const _applySuggestionSchema = z.object({
  suggestionId: z.string(),
  action: z.enum(['accept', 'reject']),
  reason: z.string().optional(),
});

// ============================================================
// POST - Generate suggestions
// ============================================================

export async function POST(request: NextRequest) {
  // Feature flag guard
  if (!FEATURES.SCHEDULING_SUGGESTIONS) {
    return NextResponse.json({ suggestions: [] }, { status: 200 });
  }

  try {
    const session = await auth();
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const supabase = await createSupabaseServerClient();
    const userData = await getUserById(supabase, session.user.id);
    
    if (!userData?.user_metadata?.firmId) {
      return NextResponse.json({ error: 'No firm association' }, { status: 403 });
    }

    const user = {
      id: userData.id,
      firmId: userData.user_metadata?.firmId || userData.user_metadata?.firm_id,
      role: userData.user_metadata?.role || 'REPORTER',
    };
    
    // Basic role check (ADMIN, AGENCY_OWNER, AGENCY_MANAGER can view)
    if (
      user.role !== UserRole.ADMIN &&
      user.role !== UserRole.AGENCY_OWNER &&
      user.role !== UserRole.AGENCY_MANAGER
    ) {
      return NextResponse.json(
        { error: 'Insufficient permissions to view suggestions' },
        { status: 403 }
      );
    }
    
    const body = await request.json();
    const validation = getSuggestionsSchema.safeParse(body);
    
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validation.error.issues },
        { status: 400 }
      );
    }
    
    const data = validation.data;
    const suggestions: unknown[] = [];
    
    // Build context
    const _context = {
      firmId: user.firmId as string,
      eventType: data.eventType,
      requestedStart: data.requestedStart ? new Date(data.requestedStart) : undefined,
      requestedEnd: data.requestedEnd ? new Date(data.requestedEnd) : undefined,
      requestedReporterId: data.requestedReporterId,
      location: data.location,
      isRemote: data.isRemote,
      estimatedDuration: data.estimatedDuration,
    };
    
    // Phase 5 feature - disabled (feature-flagged)
    // Return empty suggestions array
    
    return NextResponse.json({
      suggestions,
      generated: new Date().toISOString(),
    });
    
  } catch (error) {
    console.error('Generate suggestions error:', error);
    return NextResponse.json({ error: 'Failed to generate suggestions' }, { status: 500 });
  }
}

// ============================================================
// PATCH - Apply/reject suggestion
// ============================================================

export async function PATCH(_request: NextRequest) {
  // Phase 5 feature - disabled
  return NextResponse.json({ error: 'Suggestions feature is disabled' }, { status: 403 });
}

// ============================================================
// GET - Get saved suggestions for an event
// ============================================================

export async function GET(_request: NextRequest) {
  // Feature flag guard
  if (!FEATURES.SCHEDULING_SUGGESTIONS) {
    return NextResponse.json({ suggestions: [] }, { status: 200 });
  }
  try {
    const session = await auth();
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const supabase = await createSupabaseServerClient();
    const userData = await getUserById(supabase, session.user.id);
    
    if (!userData?.user_metadata?.firmId) {
      return NextResponse.json({ error: 'No firm association' }, { status: 403 });
    }

    const user = {
      id: userData.id,
      firmId: userData.user_metadata?.firmId || userData.user_metadata?.firm_id,
      role: userData.user_metadata?.role || 'REPORTER',
    };
    
    // Basic role check (ADMIN, AGENCY_OWNER, AGENCY_MANAGER can view)
    if (
      user.role !== UserRole.ADMIN &&
      user.role !== UserRole.AGENCY_OWNER &&
      user.role !== UserRole.AGENCY_MANAGER
    ) {
      return NextResponse.json(
        { error: 'Insufficient permissions to view suggestions' },
        { status: 403 }
      );
    }
    
    // Phase 5 feature - return empty array
    const suggestions: unknown[] = [];
    
    return NextResponse.json({ suggestions });
    
  } catch (error) {
    console.error('Get suggestions error:', error);
    return NextResponse.json({ error: 'Failed to fetch suggestions' }, { status: 500 });
  }
}

