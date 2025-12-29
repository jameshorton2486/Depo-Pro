import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { notFound, redirect } from 'next/navigation';
import { TranscriptViewer } from '@/components/attorney/transcript-viewer';

interface Props {
  params: Promise<{ id: string }>;
}

export default async function AttorneyTranscriptViewerPage({ params }: Props) {
  const { id } = await params;
  const session = await auth();
  
  if (!session?.user?.id || !session?.user?.email) {
    redirect('/login');
  }

  // Verify access through TranscriptShare or Direct Access
  const share = await db.transcriptShare.findFirst({
    where: {
      transcriptId: id,
      recipientEmail: session.user.email,
      status: 'ACTIVE',
      OR: [
        { expiresAt: { gt: new Date() } },
        { expiresAt: null }
      ]
    },
  });

  const directAccess = await db.transcriptAccess.findUnique({
    where: {
      transcriptId_userId: {
        transcriptId: id,
        userId: session.user.id
      }
    }
  });

  if (!share && !directAccess) {
    redirect('/attorney/transcripts');
  }

  const accessLevel = directAccess?.accessLevel || share?.accessLevel || 'VIEW';

  const transcript = await db.transcript.findUnique({
    where: { id },
    include: {
      job: {
        select: {
          caseName: true,
          caseNumber: true,
          depositionDate: true,
          files: {
            where: { type: 'AUDIO' },
            select: { storageUrl: true },
            take: 1,
          },
        },
      },
      highlights: {
        where: { userId: session.user.id },
      },
      notes: {
        where: { userId: session.user.id },
      },
      bookmarks: {
        where: { userId: session.user.id },
      },
    },
  });

  if (!transcript) {
    notFound();
  }

  const audioFileUrl = transcript.job.files[0]?.storageUrl || null;

  return (
    <TranscriptViewer 
      transcript={{
        ...transcript,
        job: {
          ...transcript.job,
          witnessName: null, // Witness name not directly on job select
          audioFileUrl
        }
      } as any}
      accessLevel={accessLevel as any}
      audioUrl={audioFileUrl}
    />
  );
}
