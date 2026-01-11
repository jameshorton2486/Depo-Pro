// Migrated from Prisma to Supabase queries — PASS 2A
import { auth } from '@/lib/auth-compat';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { getTranscriptById } from '@/lib/supabase/queries/transcripts';
import { getJobById } from '@/lib/supabase/queries/jobs';
import { notFound, redirect } from 'next/navigation';
import { TranscriptViewer } from '@/components/attorney/transcript-viewer';

export const dynamic = 'force-dynamic';

interface Props {
  params: Promise<{ id: string }>;
}

export default async function AttorneyTranscriptViewerPage({ params }: Props) {
  const { id } = await params;
  const session = await auth();

  if (!session?.user?.id || !session?.user?.email) {
    redirect('/login');
  }

  const supabase = await createSupabaseServerClient();

  // Verify access through TranscriptShare or Direct Access
  const { data: share } = await supabase
    .from('transcript_shares')
    .select('*')
    .eq('transcription_id', id)
    .eq('email', session.user.email)
    .eq('status', 'ACTIVE')
    .or('expires_at.gt.' + new Date().toISOString() + ',expires_at.is.null')
    .maybeSingle();

  const { data: directAccess } = await supabase
    .from('transcript_access')
    .select('*')
    .eq('transcription_id', id)
    .eq('user_id', session.user.id)
    .maybeSingle();

  if (!share && !directAccess) {
    redirect('/attorney/transcripts');
  }

  const accessLevel = directAccess?.access_level || share?.access_level || 'VIEW';

  // Get transcript
  const transcript = await getTranscriptById(supabase, id);

  if (!transcript) {
    notFound();
  }

  // Get job
  const job = await getJobById(supabase, transcript.job_id, {
    includeFiles: true,
  });

  if (!job) {
    notFound();
  }

  // Get user-specific data
  const [highlightsResult, notesResult, bookmarksResult] = await Promise.all([
    supabase.from('transcript_highlights').select('*').eq('transcription_id', id).eq('user_id', session.user.id),
    supabase.from('transcript_notes').select('*').eq('transcription_id', id).eq('user_id', session.user.id),
    supabase.from('transcript_bookmarks').select('*').eq('transcription_id', id).eq('user_id', session.user.id),
  ]);

  const audioFile = (job.files || []).find((f: any) => f.type === 'AUDIO');
  const audioFileUrl = audioFile?.storage_url || audioFile?.storageUrl || null;

  return (
    <TranscriptViewer
      transcript={{
        ...transcript,
        job: {
          case_name: job.case_name,
          case_number: job.case_number,
          deposition_date: job.deposition_date,
          witnessName: job.deponent_name || null,
          audioFileUrl,
        },
        highlights: highlightsResult.data || [],
        notes: notesResult.data || [],
        bookmarks: bookmarksResult.data || [],
      } as any}
      accessLevel={accessLevel as any}
      audioUrl={audioFileUrl}
    />
  );
}
