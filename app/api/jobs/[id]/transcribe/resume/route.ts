// app/api/jobs/[id]/transcribe/resume/route.ts
// Resume a failed transcription pipeline

import type { NextRequest } from 'next/server';
import { UserRole as GuardRole } from '@/lib/enums/roles';
import { withRouteProtection } from '@/lib/middleware/withRouteProtection';
import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/session';
import { resumePipeline } from '@/lib/transcription/scheduler';

interface RouteContext {
  params: Promise<{ id: string }>;
}

const POSTHandler = async (
  request: NextRequest,
  context: RouteContext,
) => {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: jobId } = await context.params;

    // Get base URL for chaining
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || (process.env.NEXT_PUBLIC_SITE_URL ?? 'https://depo-pro.com');

    // Resume pipeline
    const result = await resumePipeline(jobId, baseUrl);

    return NextResponse.json({
      success: true,
      message: 'Pipeline resumed successfully',
      jobId,
      resumedFromChunk: result.resumedFromChunk,
    });
  } catch (error: any) {
    console.error('Error resuming pipeline:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to resume pipeline' },
      { status: 500 }
    );
  }
}



export const POST = withRouteProtection(
  {
    requireAuth: true,
    requireRole: [GuardRole.ADMIN, GuardRole.REPORTER, GuardRole.COURT_REPORTER],
    rateLimit: { limit: 10, windowMs: 60_000 },
  },
  async (request, { params }) => ((POSTHandler) as any)(request, { params: Promise.resolve(params as any) })
);
