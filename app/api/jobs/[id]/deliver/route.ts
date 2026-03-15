// app/api/jobs/[id]/deliver/route.ts
// Deliver a certified transcript to the ordering attorney via secure link.

import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { UserRole } from '@/lib/enums/roles';
import { withRouteProtection } from '@/lib/middleware/withRouteProtection';
import type { ProtectedContext } from '@/lib/middleware/withRouteProtection';
import { createAdminClient } from '@/lib/supabase/admin';
import { generateDownloadToken } from '@/lib/security/download-tokens';
import { sendEmail, transcriptDeliveredEmail } from '@/lib/email';
import { isAdminRole } from '@/lib/admin';

const POSTHandler = async (
  request: NextRequest,
  { user, supabase, params }: ProtectedContext,
) => {
  try {
    const jobId = params.id;
    const body = await request.json();
    const { transcriptId, orderingEmail, orderingName } = body as {
      transcriptId: string;
      orderingEmail: string;
      orderingName: string;
    };

    if (!transcriptId || !orderingEmail) {
      return NextResponse.json(
        { error: 'transcriptId and orderingEmail are required' },
        { status: 400 }
      );
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(orderingEmail)) {
      return NextResponse.json(
        { error: 'Invalid email address' },
        { status: 400 }
      );
    }

    // Fetch job and verify access
    const { data: job } = await supabase
      .from('jobs')
      .select('id, title, case_name, case_number, deposition_date, firm_id, created_by_id, status')
      .eq('id', jobId)
      .single();

    if (!job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    const isOwner = job.created_by_id === user.id;
    const isSameFirm = job.firm_id === user.firm_id;
    const isAdmin = isAdminRole(user.role);

    if (!isOwner && !isSameFirm && !isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Verify transcript exists
    const { data: transcription } = await supabase
      .from('transcriptions')
      .select('id, status')
      .eq('id', transcriptId)
      .eq('job_id', jobId)
      .single();

    if (!transcription) {
      return NextResponse.json({ error: 'Transcript not found' }, { status: 404 });
    }

    // Fetch reporter name for the email
    const adminClient = createAdminClient();
    const { data: reporterProfile } = await adminClient
      .from('profiles')
      .select('full_name, email')
      .eq('id', user.id)
      .single();

    const reporterName = reporterProfile?.full_name || reporterProfile?.email || 'Your Court Reporter';

    // Generate secure one-time download token
    const token = await generateDownloadToken(jobId, transcriptId, orderingEmail, 72);

    // Update job status to COMPLETED
    await adminClient
      .from('jobs')
      .update({ status: 'COMPLETED', updated_at: new Date().toISOString() })
      .eq('id', jobId);

    // Send delivery email to attorney
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://depo-pro.com';
    const depositionDate = job.deposition_date
      ? new Date(job.deposition_date).toLocaleDateString('en-US', {
          month: 'long', day: 'numeric', year: 'numeric',
        })
      : 'Date unknown';

    const emailOptions = transcriptDeliveredEmail({
      recipientName: orderingName || orderingEmail,
      recipientEmail: orderingEmail,
      caseStyle: job.case_name || job.title || 'Unknown Case',
      causeNumber: job.case_number || 'N/A',
      deponentName: job.title?.replace('Deposition of ', '') || 'Unknown Deponent',
      depositionDate,
      reporterName,
      downloadToken: token,
      expiresHours: 72,
    });

    const emailResult = await sendEmail(emailOptions);

    if (!emailResult.success) {
      console.error('[deliver] Email send failed:', emailResult.error);
    }

    console.warn(`[deliver] Transcript delivered for job ${jobId} to ${orderingEmail}`);

    return NextResponse.json({
      success: true,
      jobId,
      newStatus: 'COMPLETED',
      downloadUrl: `${siteUrl}/api/download/${token}`,
      emailSent: emailResult.success,
      message: emailResult.success
        ? `Transcript delivered. Download link sent to ${orderingEmail}`
        : `Transcript ready. Email delivery failed — share this link: ${siteUrl}/api/download/${token}`,
    });

  } catch (err: any) {
    console.error('[deliver] Unexpected error:', err.message);
    return NextResponse.json({ error: 'Delivery failed' }, { status: 500 });
  }
};

export const POST = withRouteProtection(
  {
    requireAuth: true,
    requireRole: [UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.REPORTER, UserRole.COURT_REPORTER],
    requireFirm: true,
    rateLimit: { limit: 10, windowMs: 60_000 },
    auditAction: 'TRANSCRIPT_DELIVERED',
  },
  POSTHandler,
);
