import { NextResponse, type NextRequest } from 'next/server';
import { withRouteProtection, type ProtectedContext } from '@/lib/middleware/withRouteProtection';
import { buildAdminOverrides, createJobFromSubmission, writeKeywords, type IntakeSubmissionPayload } from '@/lib/intake/workflow';

const handler = async (request: NextRequest, { supabase, user, params }: ProtectedContext) => {
  const requestId = params.id;
  const body = await request.json();
  const action = body?.action as 'APPROVE' | 'MODIFY_AND_APPROVE' | 'DECLINE';

  const { data: transcriptRequest, error } = await supabase
    .from('transcript_requests')
    .select('*')
    .eq('id', requestId)
    .eq('firm_id', user.firm_id)
    .single();

  if (error || !transcriptRequest) {
    return NextResponse.json({ error: 'Request not found' }, { status: 404 });
  }

  if (action === 'DECLINE') {
    if (!body?.declineReason) {
      return NextResponse.json({ error: 'declineReason is required' }, { status: 400 });
    }

    const { error: declineError } = await supabase
      .from('transcript_requests')
      .update({
        status: 'DECLINED',
        reviewed_by: user.id,
        reviewed_at: new Date().toISOString(),
        decline_reason: body.declineReason,
        admin_notes: body.adminNotes ?? null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', requestId);

    if (declineError) {
      return NextResponse.json({ error: declineError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, status: 'DECLINED' });
  }

  const updates: Partial<IntakeSubmissionPayload> = body?.updates ?? {};
  const overrides = buildAdminOverrides(transcriptRequest, {
    deposition_date: updates.depositionDate ?? transcriptRequest.deposition_date,
    start_time: updates.startTime ?? transcriptRequest.start_time,
    audio_processing: updates.audioProcessing ?? transcriptRequest.audio_processing,
    deponent_name: updates.deponentName ?? transcriptRequest.deponent_name,
    ordering_attorney: updates.orderingAttorney ?? transcriptRequest.ordering_attorney,
    ordering_firm: updates.orderingFirm ?? transcriptRequest.ordering_firm,
    location: updates.location ?? transcriptRequest.location,
  });

  const payload: IntakeSubmissionPayload = {
    jobTitle: updates.jobTitle ?? transcriptRequest.job_title,
    caseName: updates.caseName ?? transcriptRequest.case_name,
    caseNumber: updates.caseNumber ?? transcriptRequest.case_number,
    causeNumber: updates.causeNumber ?? transcriptRequest.cause_number,
    caseStyle: updates.caseStyle ?? transcriptRequest.case_style,
    deponentName: updates.deponentName ?? transcriptRequest.deponent_name,
    depositionDate: updates.depositionDate ?? transcriptRequest.deposition_date,
    startTime: updates.startTime ?? transcriptRequest.start_time,
    timezone: updates.timezone ?? transcriptRequest.timezone,
    location: updates.location ?? transcriptRequest.location,
    isRemote: updates.isRemote ?? transcriptRequest.is_remote,
    remotePlatform: updates.remotePlatform ?? transcriptRequest.remote_platform,
    zoomLink: updates.zoomLink ?? transcriptRequest.zoom_link,
    orderingAttorney: updates.orderingAttorney ?? transcriptRequest.ordering_attorney,
    orderingFirm: updates.orderingFirm ?? transcriptRequest.ordering_firm,
    orderingEmail: updates.orderingEmail ?? transcriptRequest.ordering_email,
    orderingPhone: updates.orderingPhone ?? transcriptRequest.ordering_phone,
    audioProcessing: updates.audioProcessing ?? transcriptRequest.audio_processing,
    notes: updates.notes ?? transcriptRequest.notes,
    courtName: updates.courtName ?? transcriptRequest.court_name,
    courtNumber: updates.courtNumber ?? transcriptRequest.court_number,
    county: updates.county ?? transcriptRequest.county,
    state: updates.state ?? transcriptRequest.state,
    documentId: transcriptRequest.document_id,
    extractedData: transcriptRequest.extracted_data,
  };

  let jobId: string;
  try {
    jobId = await createJobFromSubmission(supabase, payload, {
      id: user.id,
      role: 'ADMIN',
      firm_id: user.firm_id,
    }, requestId);

    await writeKeywords(
      transcriptRequest.extracted_data?.transcription_keywords?.all_keywords ?? [],
      user.firm_id,
      jobId,
      supabase,
      user.id,
    );
  } catch (err) {
    console.error('[review] Job creation from request failed:', err);
    return NextResponse.json(
      { error: 'Failed to create job from request' },
      { status: 500 },
    );
  }

  const nextStatus = action === 'MODIFY_AND_APPROVE' && Object.keys(overrides).length
    ? 'MODIFIED_AND_APPROVED'
    : 'APPROVED';

  const { error: updateError } = await supabase
    .from('transcript_requests')
    .update({
      status: nextStatus,
      reviewed_by: user.id,
      reviewed_at: new Date().toISOString(),
      admin_notes: body.adminNotes ?? null,
      admin_overrides: Object.keys(overrides).length ? overrides : null,
      approved_job_id: jobId,
      updated_at: new Date().toISOString(),
    })
    .eq('id', requestId);

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, status: nextStatus, jobId, adminOverrides: overrides });
};

export const PATCH = withRouteProtection(
  {
    requireAuth: true,
    requireRole: ['ADMIN'] as unknown as any,
    requireFirm: true,
  },
  handler,
);
