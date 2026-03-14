import { type NextRequest, NextResponse } from 'next/server';
import { withRouteProtection, type ProtectedContext } from '@/lib/middleware/withRouteProtection';
import { UserRole } from '@/lib/enums/roles';
import { logger } from '@/lib/logger';

/**
 * Dictionary API - Redirects to proper-nouns API for backward compatibility
 * This endpoint is kept for legacy support but forwards to the new proper-nouns endpoint
 */

const getHandler = async (request: NextRequest, { params }: ProtectedContext) => {
  const jobId = params.id;

  if (!jobId) {
    return NextResponse.json({ error: 'Job ID required' }, { status: 400 });
  }

  // Redirect to proper-nouns endpoint
  return NextResponse.redirect(new URL(`/api/jobs/${jobId}/proper-nouns`, request.url));
};

const postHandler = async (request: NextRequest, { params }: ProtectedContext) => {
  const jobId = params.id;

  if (!jobId) {
    return NextResponse.json({ error: 'Job ID required' }, { status: 400 });
  }

  // Forward request to proper-nouns endpoint
  const body = await request.json().catch(() => ({}));
  let response: Response;
  try {
    response = await fetch(new URL(`/api/jobs/${jobId}/proper-nouns`, request.url), {
      method: 'POST',
      headers: request.headers,
      body: JSON.stringify(body),
    });
  } catch (error) {
    logger.error('Dictionary proxy failed', error instanceof Error ? error : new Error(String(error)));
    return NextResponse.json({ error: 'Failed to forward request' }, { status: 502 });
  }

  return NextResponse.json(await response.json(), { status: response.status });
};

const JOB_ROLES = [
  UserRole.ADMIN,
  UserRole.COURT_REPORTER,
  UserRole.REPORTER,
  UserRole.SCOPIST,
  UserRole.ATTORNEY,
  UserRole.AGENCY_OWNER,
  UserRole.AGENCY_MANAGER,
];

export const GET = withRouteProtection(
  { requireAuth: true, requireRole: JOB_ROLES, requireFirm: true },
  getHandler,
);

export const POST = withRouteProtection(
  { requireAuth: true, requireRole: JOB_ROLES, requireFirm: true },
  postHandler,
);
