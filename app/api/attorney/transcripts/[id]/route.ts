// ═══════════════════════════════════════════════════════════════
// ATTORNEY TRANSCRIPT API (Single)
// ═══════════════════════════════════════════════════════════════

import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { getUserById } from '@/lib/supabase/queries/users';
import { Role } from '@/lib/constants';

/**
 * GET /api/attorney/transcripts/[id]
 * Get a single transcript with annotations
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getCurrentUser();

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (session.user.role !== Role.ATTORNEY && session.user.role !== Role.ADMIN) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await params;

    const supabase = await createSupabaseServerClient();

    const { data: transcript, error: transcriptError } = await supabase
      .from('attorney_transcripts')
      .select('*')
      .eq('id', id)
      .single();

    if (transcriptError || !transcript) {
      return NextResponse.json({ error: 'Transcript not found' }, { status: 404 });
    }

    // Check access (only creator or admin)
    if (transcript.uploaded_by_id !== session.user.id && session.user.role !== Role.ADMIN) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Get annotations
    const { data: annotations } = await supabase
      .from('transcript_annotations')
      .select('*')
      .eq('transcription_id', id)
      .order('created_at', { ascending: false });

    // Get uploaded by info
    const uploadedBy = await getUserById(supabase, transcript.uploaded_by_id);

    return NextResponse.json({
      transcript: {
        ...transcript,
        annotations: annotations || [],
        uploadedBy: uploadedBy ? {
          id: uploadedBy.id,
          firstName: uploadedBy.user_metadata?.firstName || '',
          lastName: uploadedBy.user_metadata?.lastName || '',
          email: uploadedBy.email || '',
        } : null,
      },
    });
  } catch (error) {
    console.error('Error fetching transcript:', error);
    return NextResponse.json(
      { error: 'Failed to fetch transcript' },
      { status: 500 },
    );
  }
}
