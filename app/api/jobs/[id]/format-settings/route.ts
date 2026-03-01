import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/session';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import {
  DEFAULT_FORMAT_OPTIONS,
  DEFAULT_PROCESSING_RULES,
  type TranscriptFormatConfig,
} from '@/types/transcript-format';

interface RouteContext {
  params: Promise<{ id: string }>;
}

function getDefaultSettings(): TranscriptFormatConfig {
  return {
    speakerMappings: [],
    examinationSections: [],
    formatOptions: DEFAULT_FORMAT_OPTIONS,
    processingRules: DEFAULT_PROCESSING_RULES,
  };
}

function hasJobAccess(
  job: {
    created_by_id?: string | null;
    reporter_id?: string | null;
    scopist_id?: string | null;
    firm_id?: string | null;
  },
  currentUser: { id: string; role: string; firmId?: string | null }
) {
  const isOwner = job.created_by_id === currentUser.id;
  const isReporter = job.reporter_id === currentUser.id;
  const isScopist = job.scopist_id === currentUser.id;
  const isAdmin = currentUser.role === 'ADMIN';
  const isSameFirm =
    !!job.firm_id &&
    !!currentUser.firmId &&
    job.firm_id === currentUser.firmId;

  return isOwner || isReporter || isScopist || isAdmin || isSameFirm;
}

export async function GET(
  _request: NextRequest,
  context: RouteContext
) {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await context.params;
  const supabase = await createSupabaseServerClient();

  const { data: job, error } = await supabase
    .from('jobs')
    .select('id, created_by_id, reporter_id, scopist_id, firm_id, format_settings')
    .eq('id', id)
    .single();

  if (error || !job) {
    return NextResponse.json({ error: error?.message || 'Job not found' }, { status: 404 });
  }

  if (!hasJobAccess(job, currentUser)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const settings =
    (job.format_settings as TranscriptFormatConfig | null) ?? getDefaultSettings();

  return NextResponse.json({ data: settings });
}

export async function PATCH(
  request: NextRequest,
  context: RouteContext
) {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await context.params;
  const supabase = await createSupabaseServerClient();

  const { data: job, error: jobError } = await supabase
    .from('jobs')
    .select('id, created_by_id, reporter_id, scopist_id, firm_id')
    .eq('id', id)
    .single();

  if (jobError || !job) {
    return NextResponse.json({ error: jobError?.message || 'Job not found' }, { status: 404 });
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
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}

