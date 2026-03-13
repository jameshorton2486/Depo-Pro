import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { UserRole } from '@/lib/enums/roles';
import { withRouteProtection } from '@/lib/middleware/withRouteProtection';
import type { ProtectedContext } from '@/lib/middleware/withRouteProtection';
import {
  DEFAULT_FORMAT_OPTIONS,
  DEFAULT_PROCESSING_RULES,
  type TranscriptFormatConfig,
} from '@/src/types/transcript-format';
import { handleSupabaseError } from '@/lib/errors/api-error';
import { isAdminRole } from '@/lib/admin';

function hasJobAccess(job: any, currentUser: { id: string; role: string; firm_id?: string | null }) {
  const isOwner = job?.created_by_id === currentUser.id;
  const isReporter = job?.reporter_id === currentUser.id;
  const isScopist = job?.scopist_id === currentUser.id;
  const isAdmin = isAdminRole(currentUser.role);
  const isSameFirm = !!job?.firm_id && job.firm_id === currentUser.firm_id;
  return isOwner || isReporter || isScopist || isAdmin || isSameFirm;
}

function getDefaultSettings(): TranscriptFormatConfig {
  return {
    speakerMappings: [],
    examinationSections: [],
    formatOptions: DEFAULT_FORMAT_OPTIONS,
    processingRules: DEFAULT_PROCESSING_RULES,
  };
}

const GETHandler = async (
  _request: NextRequest,
  context: ProtectedContext,
) => {
  const currentUser = context.user;

  const { id } = context.params;
  const supabase = context.supabase;

  const { data: job, error } = await supabase
    .from('jobs')
    .select('id, created_by_id, reporter_id, scopist_id, firm_id, format_settings')
    .eq('id', id)
    .single();

  if (error || !job) {
    return error ? handleSupabaseError(error, 'jobs/format-settings') : NextResponse.json({ error: 'Job not found' }, { status: 404 });
  }

  if (!hasJobAccess(job, currentUser)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const settings: TranscriptFormatConfig =
    (job.format_settings as TranscriptFormatConfig | null) ?? getDefaultSettings();

  return NextResponse.json({ data: settings });
};

const PATCHHandler = async (
  request: NextRequest,
  context: ProtectedContext,
) => {
  const currentUser = context.user;

  const { id } = context.params;
  const supabase = context.supabase;

  const { data: job, error: jobError } = await supabase
    .from('jobs')
    .select('id, created_by_id, reporter_id, scopist_id, firm_id')
    .eq('id', id)
    .single();

  if (jobError || !job) {
    return jobError ? handleSupabaseError(jobError, 'jobs/format-settings') : NextResponse.json({ error: 'Job not found' }, { status: 404 });
  }

  if (!hasJobAccess(job, currentUser)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await request.json();

  const { error } = await supabase
    .from('jobs')
    .update({ format_settings: body, updated_at: new Date().toISOString() })
    .eq('id', id);

  if (error) {
    return handleSupabaseError(error, 'jobs/format-settings');
  }

  return NextResponse.json({ success: true });
};

export const GET = withRouteProtection(
  {
    requireAuth: true,
    requireRole: [UserRole.ADMIN, UserRole.REPORTER, UserRole.COURT_REPORTER, UserRole.SCOPIST],
    rateLimit: { limit: 60, windowMs: 60_000 },
  },
  GETHandler
);

export const PATCH = withRouteProtection(
  {
    requireAuth: true,
    requireRole: [UserRole.ADMIN, UserRole.REPORTER, UserRole.COURT_REPORTER, UserRole.SCOPIST],
    rateLimit: { limit: 30, windowMs: 60_000 },
  },
  PATCHHandler
);
