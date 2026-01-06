import { auth } from '@/lib/auth';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { TranscriptList } from '@/components/attorney/transcript-list';
import { redirect } from 'next/navigation';

export const metadata = {
  title: 'Shared Transcripts | Depo-Pro',
};

export default async function AttorneyTranscriptsPage() {
  const session = await auth();

  if (!session?.user?.email) {
    redirect('/login');
  }

  // Fetch transcripts shared with current attorney using Supabase
  const supabase = await createSupabaseServerClient();
  const now = new Date().toISOString();
  
  const { data: sharedTranscriptsData, error } = await supabase
    .from('transcript_shares')
    .select(`
      id,
      recipient_email,
      expires_at,
      status,
      access_level,
      created_at,
      transcript_id,
      shared_by_id,
      transcript:transcriptions!inner(
        id,
        job_id,
        jobs!inner(
          id,
          case_name,
          case_number,
          deposition_date
        )
      )
    `)
    .eq('recipient_email', session.user.email)
    .eq('status', 'ACTIVE')
    .or(`expires_at.gt.${now},expires_at.is.null`)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching shared transcripts:', error);
    return (
      <div className="container mx-auto py-8 px-4">
        <p className="text-red-500">Error loading transcripts: {error.message}</p>
      </div>
    );
  }

  // Get shared_by user info
  const { getSupabaseAdminClient } = await import('@/lib/supabase/admin');
  const adminClient = getSupabaseAdminClient();
  const sharedByIds = [...new Set((sharedTranscriptsData || []).map(s => s.shared_by_id).filter(Boolean))];
  const sharedByUsers: Record<string, any> = {};
  
  for (const userId of sharedByIds) {
    const { data: userData } = await adminClient.auth.admin.getUserById(userId);
    if (userData?.user) {
      sharedByUsers[userId] = {
        firstName: userData.user.user_metadata?.firstName || '',
        lastName: userData.user.user_metadata?.lastName || '',
        email: userData.user.email || '',
      };
    }
  }

  const sharedTranscripts = (sharedTranscriptsData || []).map((share: any) => ({
    id: share.id,
    recipientEmail: share.recipient_email,
    expiresAt: share.expires_at,
    status: share.status,
    accessLevel: share.access_level,
    createdAt: share.created_at,
    transcript: share.transcript ? {
      id: share.transcript.id,
      job: share.transcript.jobs ? {
        id: share.transcript.jobs.id,
        caseName: share.transcript.jobs.case_name,
        caseNumber: share.transcript.jobs.case_number,
        depositionDate: share.transcript.jobs.deposition_date,
        witnessName: null, // Not available in current schema
      } : null,
    } : null,
    sharedBy: sharedByUsers[share.shared_by_id] || {
      firstName: '',
      lastName: '',
      email: '',
    },
  }));

  // Map to common format for the list component
  const formattedTranscripts = sharedTranscripts.map((share: any) => ({
    id: share.id,
    accessLevel: share.accessLevel as 'VIEW' | 'COMMENT' | 'EDIT',
    expiresAt: share.expiresAt,
    transcript: {
      id: share.transcript.id,
      job: {
        id: share.transcript.job.id,
        caseName: share.transcript.job.caseName,
        caseNumber: share.transcript.job.caseNumber,
        depositionDate: share.transcript.job.depositionDate,
        witnessName: (share.transcript.job as any).deponentName || null,
      },
    },
    sharedBy: {
      firstName: share.sharedBy.firstName,
      lastName: share.sharedBy.lastName,
      email: share.sharedBy.email
    },
    createdAt: share.createdAt,
  }));

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Shared Transcripts</h1>
          <p className="text-muted-foreground mt-1">
            Access and review transcripts shared with you by reporters and firms.
          </p>
        </div>
      </div>

      <TranscriptList transcripts={formattedTranscripts} />
    </div>
  );
}
