// =============================================================================
// REMOTE MEETING INFO API - Phase 6A
// GET /api/depositions/[jobId]/remote-meeting - Get meeting info (field-filtered)
// PUT /api/depositions/[jobId]/remote-meeting - Create or update meeting info
// =============================================================================

import { NextRequest } from 'next/server';
import { db as prisma } from '@/lib/db';
import { getCurrentUser, requireCurrentUser } from '@/lib/auth/session';
import { requireRole, requireAnyRole } from '@/lib/auth/permissions';
import { UserRole, MeetingPlatform } from '@prisma/client';
import { handleApiError, success, error } from '@/lib/api-response';

// GET /api/depositions/[jobId]/remote-meeting - Get meeting info
export async function GET(
  _: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return error('UNAUTHENTICATED', 'Authentication required', 401);
    }

    const { jobId } = await params;

    // Scopists explicitly cannot access meeting info
    if (user.role === UserRole.SCOPIST) {
      return error('FORBIDDEN', 'Scopists cannot access meeting information', 403);
    }

    // Check if user has permission to view meeting info
    if (!requireAnyRole(user.role, [
      UserRole.REPORTER,
      UserRole.ATTORNEY,
      UserRole.ADMIN,
      // TODO: Add VIDEOGRAPHER and INTERPRETER roles when available
    ])) {
      return error('FORBIDDEN', 'You do not have permission to view meeting information', 403);
    }

    const meeting = await prisma.remoteMeetingInfo.findUnique({
      where: { jobId },
    });

    if (!meeting) {
      return success(null);
    }

    // Strip host key if user shouldn't see it
    // Only REPORTER, VIDEOGRAPHER, INTERPRETER can see host key
    const canSeeHostKey = requireAnyRole(user.role, [
      UserRole.REPORTER,
      UserRole.ADMIN,
      // TODO: Add VIDEOGRAPHER and INTERPRETER roles when available
    ]);

    if (!canSeeHostKey) {
      const { hostKey: _hostKey, coHostKey: _coHostKey, ...publicFields } = meeting;
      return success(publicFields);
    }

    return success(meeting);
  } catch (err) {
    return handleApiError(err);
  }
}

// PUT /api/depositions/[jobId]/remote-meeting - Create or update meeting info
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  try {
    const user = await requireCurrentUser();
    const { jobId } = await params;

    // Only reporters can edit meeting info
    requireRole(user.role, [UserRole.REPORTER, UserRole.ADMIN]);

    // Verify job access
    const job = await prisma.job.findUnique({
      where: { id: jobId },
      select: {
        id: true,
        createdById: true,
      },
    });

    if (!job) {
      return error('NOT_FOUND', 'Job not found', 404);
    }

    if (job.createdById !== user.id && user.role !== UserRole.ADMIN) {
      return error('FORBIDDEN', 'You can only edit meeting info for your own jobs', 403);
    }

    const body = await req.json();
    const {
      platform,
      meetingUrl,
      meetingId,
      passcode,
      dialInNumbers,
      hostKey,
      coHostKey,
      cloudRecordingUrl,
      cloudRecordingPassword,
    } = body;

    // Validate platform if provided
    if (platform && !Object.values(MeetingPlatform).includes(platform)) {
      return error('VALIDATION_ERROR', 'Invalid meeting platform', 400);
    }

    // Upsert meeting info
    const meeting = await prisma.remoteMeetingInfo.upsert({
      where: { jobId },
      create: {
        jobId,
        platform: platform || MeetingPlatform.ZOOM,
        meetingUrl: meetingUrl || null,
        meetingId: meetingId || null,
        passcode: passcode || null,
        dialInNumbers: dialInNumbers || null,
        hostKey: hostKey || null,
        coHostKey: coHostKey || null,
        cloudRecordingUrl: cloudRecordingUrl || null,
        cloudRecordingPassword: cloudRecordingPassword || null,
      },
      update: {
        ...(platform !== undefined && { platform }),
        ...(meetingUrl !== undefined && { meetingUrl: meetingUrl || null }),
        ...(meetingId !== undefined && { meetingId: meetingId || null }),
        ...(passcode !== undefined && { passcode: passcode || null }),
        ...(dialInNumbers !== undefined && { dialInNumbers: dialInNumbers || null }),
        ...(hostKey !== undefined && { hostKey: hostKey || null }),
        ...(coHostKey !== undefined && { coHostKey: coHostKey || null }),
        ...(cloudRecordingUrl !== undefined && { cloudRecordingUrl: cloudRecordingUrl || null }),
        ...(cloudRecordingPassword !== undefined && { cloudRecordingPassword: cloudRecordingPassword || null }),
      },
    });

    // Return filtered version (without hostKey for non-reporters, but user is reporter here)
    return success(meeting);
  } catch (err) {
    if (err instanceof Error) {
      if (err.message === 'FORBIDDEN') {
        return error('FORBIDDEN', 'You do not have permission to edit meeting information', 403);
      }
      if (err.message === 'UNAUTHENTICATED') {
        return error('UNAUTHENTICATED', 'Authentication required', 401);
      }
    }
    return handleApiError(err);
  }
}