import { NextResponse, type NextRequest } from 'next/server';
import { withRouteProtection, type ProtectedContext } from '@/lib/middleware/withRouteProtection';
import { buildAdminOverrides, createJobFromSubmission, writeKeywords, type IntakeSubmissionPayload } from '@/lib/intake/workflow';

const DIRECT_CREATE_ROLES = new Set(['ADMIN', 'COURT_REPORTER', 'REPORTER']);
const PERMITTED_ROLES = ['ADMIN', 'COURT_REPORTER', 'REPORTER', 'ATTORNEY', 'PARALEGAL', 'LAW_FIRM', 'AGENCY'] as const;

const handler = async (request: NextRequest, { supabase, user }: ProtectedContext) => {
  const payload = (await request.json()) as IntakeSubmissionPayload;
  if (!payload.jobTitle || !payload.depositionDate || !payload.startTime) {
    return NextResponse.json({ error: 'jobTitle, depositionDate, and startTime are required' }, { status: 400 });
  }

  if (DIRECT_CREATE_ROLES.has(user.role)) {
    const jobId = await createJobFromSubmission(supabase, payload, user);
    await writeKeywords(payload.extractedData?.transcription_keywords.all_keywords ?? [], user.firm_id, jobId, supabase);

    return NextResponse.json({
      success: true,
      submissionType: 'JOB',
      jobId,
      overrides: buildAdminOverrides({}, {}),
    });
  }

  const { data, error } = await supabase
    .from('transcript_requests')
    .insert({
      firm_id: user.firm_id,
      submitted_by: user.id,
      submitted_by_role: user.role,
      status: 'PENDING_REVIEW',
      document_id: payload.documentId ?? null,
      job_title: payload.jobTitle,
      case_name: payload.caseName ?? null,
      case_number: payload.caseNumber ?? null,
      cause_number: payload.causeNumber ?? null,
      case_style: payload.caseStyle ?? null,
      deponent_name: payload.deponentName ?? null,
      deposition_date: payload.depositionDate,
      start_time: payload.startTime,
      timezone: payload.timezone ?? 'America/Chicago',
      location: payload.location ?? null,
      is_remote: Boolean(payload.isRemote),
      remote_platform: payload.remotePlatform ?? null,
      zoom_link: payload.zoomLink ?? null,
      ordering_attorney: payload.orderingAttorney ?? null,
      ordering_firm: payload.orderingFirm ?? null,
      ordering_email: payload.orderingEmail ?? null,
      ordering_phone: payload.orderingPhone ?? null,
      audio_processing: payload.audioProcessing ?? 'automated',
      notes: payload.notes ?? null,
      court_name: payload.courtName ?? null,
      court_number: payload.courtNumber ?? null,
      county: payload.county ?? null,
      state: payload.state ?? 'Texas',
      extracted_data: payload.extractedData ?? null,
    })
    .select('id')
    .single();

  if (error || !data?.id) {
    return NextResponse.json({ error: error?.message ?? 'Failed to create request' }, { status: 500 });
  }

  return NextResponse.json({
    success: true,
    submissionType: 'REQUEST',
    requestId: data.id,
  });
};

export const POST = withRouteProtection(
  {
    requireAuth: true,
    requireRole: PERMITTED_ROLES as unknown as any,
    requireFirm: true,
  },
  handler,
);
