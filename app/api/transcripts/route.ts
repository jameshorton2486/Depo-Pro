import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { UserRole } from '@/lib/enums/roles';
import { withRouteProtection } from '@/lib/middleware/withRouteProtection';
import type { ProtectedContext } from '@/lib/middleware/withRouteProtection';
import {
  getById,
  create,
  update,
  delete as deleteTranscript,
} from '@/lib/supabase/queries/transcripts';

/**
 * Check if user has access to a transcript's job
 */
async function checkTranscriptAccess(
  transcriptId: string,
  userId: string,
  userRole: string,
  supabase: any
) {
  // Get the transcript's job
  const { data: transcript, error: transcriptError } = await supabase
    .from('transcriptions')
    .select('job_id')
    .eq('id', transcriptId)
    .single();

  if (transcriptError || !transcript) {
    return { hasAccess: false, error: 'Transcript not found' };
  }

  // Get the job details
  const { data: job, error: jobError } = await supabase
    .from('jobs')
    .select('id, firm_id, reporter_id, scopist_id')
    .eq('id', transcript.job_id)
    .single();

  if (jobError || !job) {
    return { hasAccess: false, error: 'Job not found' };
  }

  // Get user's profile
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('firm_id, role')
    .eq('id', userId)
    .single();

  if (profileError || !profile) {
    return { hasAccess: false, error: 'Profile not found' };
  }

  // Check access:
  // 1. Admin with same firm_id
  // 2. Reporter assigned to job
  // 3. Scopist assigned to job
  // 4. User from same firm
  const hasAccess =
    (profile.role === 'ADMIN' && profile.firm_id === job.firm_id) ||
    job.reporter_id === userId ||
    job.scopist_id === userId ||
    profile.firm_id === job.firm_id;

  if (!hasAccess) {
    return { hasAccess: false, error: 'Forbidden' };
  }

  return { hasAccess: true, job };
}

/**
 * Check if user can create transcript for a job
 */
async function checkJobAccess(
  jobId: string,
  userId: string,
  supabase: any
) {
  const { data: job, error: jobError } = await supabase
    .from('jobs')
    .select('id, firm_id, reporter_id, scopist_id')
    .eq('id', jobId)
    .single();

  if (jobError || !job) {
    return { hasAccess: false, error: 'Job not found' };
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('firm_id, role')
    .eq('id', userId)
    .single();

  if (profileError || !profile) {
    return { hasAccess: false, error: 'Profile not found' };
  }

  const hasAccess =
    (profile.role === 'ADMIN' && profile.firm_id === job.firm_id) ||
    job.reporter_id === userId ||
    job.scopist_id === userId ||
    profile.firm_id === job.firm_id;

  if (!hasAccess) {
    return { hasAccess: false, error: 'Forbidden' };
  }

  return { hasAccess: true, job };
}

const getTranscriptHandler = async (
  request: NextRequest,
  { user, supabase }: ProtectedContext
) => {
  const searchParams = request.nextUrl.searchParams;
  const id = searchParams.get('id');
  const jobId = searchParams.get('jobId');

  try {
    if (id) {
      // Get user profile for role
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

      if (!profile?.role) {
        return NextResponse.json({ error: 'User profile incomplete: no role assigned' }, { status: 401 });
      }
      const accessCheck = await checkTranscriptAccess(
        id,
        user.id,
        profile.role,
        supabase
      );

      if (!accessCheck.hasAccess) {
        return NextResponse.json(
          { error: accessCheck.error },
          { status: 403 }
        );
      }

      const transcript = await getById(id, supabase);
      return NextResponse.json({ transcript });
    }

    if (jobId) {
      // Check if user can access this job's transcripts
      const accessCheck = await checkJobAccess(jobId, user.id, supabase);

      if (!accessCheck.hasAccess) {
        return NextResponse.json(
          { error: accessCheck.error },
          { status: 403 }
        );
      }

      // Get transcripts for job
      const { data: transcripts, error: transcriptsError } = await supabase
        .from('transcriptions')
        .select('*')
        .eq('job_id', jobId);

      if (transcriptsError) {
        throw transcriptsError;
      }

      return NextResponse.json({ transcripts });
    }

    return NextResponse.json(
      { error: 'id or jobId is required' },
      { status: 400 }
    );
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to fetch transcripts' },
      { status: 500 }
    );
  }
};

export const GET = withRouteProtection(
  {
    requireAuth: true,
    enforceTenant: true,
    requireRole: [UserRole.ADMIN, UserRole.COURT_REPORTER, UserRole.SCOPIST],
  },
  getTranscriptHandler
);

const postTranscriptHandler = async (
  request: NextRequest,
  { user, supabase }: ProtectedContext
) => {
  try {
    const payload = await request.json();

    if (!payload.job_id) {
      return NextResponse.json(
        { error: 'job_id is required' },
        { status: 400 }
      );
    }

    // Check authorization
    const accessCheck = await checkJobAccess(payload.job_id, user.id, supabase);

    if (!accessCheck.hasAccess) {
      return NextResponse.json(
        { error: accessCheck.error },
        { status: 403 }
      );
    }

    const transcript = await create(payload, supabase);
    return NextResponse.json({ transcript }, { status: 201 });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to create transcript' },
      { status: 500 }
    );
  }
};

const putTranscriptHandler = async (
  request: NextRequest,
  { user, supabase }: ProtectedContext
) => {

  try {
    const payload = await request.json();
    const { id, updates } = payload || {};

    if (!id || !updates) {
      return NextResponse.json(
        { error: 'id and updates are required' },
        { status: 400 }
      );
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!profile?.role) {
      return NextResponse.json({ error: 'User profile incomplete: no role assigned' }, { status: 401 });
    }
    const accessCheck = await checkTranscriptAccess(
      id,
      user.id,
      profile.role,
      supabase
    );

    if (!accessCheck.hasAccess) {
      return NextResponse.json(
        { error: accessCheck.error },
        { status: 403 }
      );
    }

    const transcript = await update(id, updates, supabase);
    return NextResponse.json({ transcript });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to update transcript' },
      { status: 500 }
    );
  }
};

const deleteTranscriptHandler = async (
  request: NextRequest,
  { user, supabase }: ProtectedContext
) => {

  const searchParams = request.nextUrl.searchParams;
  const id = searchParams.get('id');

  if (!id) {
    return NextResponse.json({ error: 'id is required' }, { status: 400 });
  }

  try {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!profile?.role) {
      return NextResponse.json({ error: 'User profile incomplete: no role assigned' }, { status: 401 });
    }
    const accessCheck = await checkTranscriptAccess(
      id,
      user.id,
      profile.role,
      supabase
    );

    if (!accessCheck.hasAccess) {
      return NextResponse.json(
        { error: accessCheck.error },
        { status: 403 }
      );
    }

    await deleteTranscript(id, supabase);
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to delete transcript' },
      { status: 500 }
    );
  }
};

export const POST = withRouteProtection(
  {
    requireAuth: true,
    enforceTenant: true,
    requireRole: [UserRole.ADMIN, UserRole.COURT_REPORTER, UserRole.SCOPIST],
  },
  postTranscriptHandler
);

export const PUT = withRouteProtection(
  {
    requireAuth: true,
    enforceTenant: true,
    requireRole: [UserRole.ADMIN, UserRole.COURT_REPORTER, UserRole.SCOPIST],
  },
  putTranscriptHandler
);

export const DELETE = withRouteProtection(
  {
    requireAuth: true,
    enforceTenant: true,
    requireRole: [UserRole.ADMIN],
  },
  deleteTranscriptHandler
);
