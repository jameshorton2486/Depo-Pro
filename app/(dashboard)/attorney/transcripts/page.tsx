import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
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

  // Fetch transcripts shared with current attorney
  // We use TranscriptShare model from Phase 3
  const sharedTranscripts = await db.transcriptShare.findMany({
    where: {
      AND: [
        { recipientEmail: session.user.email },
        {
          OR: [
            { expiresAt: { gt: new Date() } },
            { expiresAt: null }
          ],
        },
      ],
      status: 'ACTIVE',
    },
    include: {
      transcript: {
        include: {
          job: true
        }
      },
      sharedBy: true
    },
    orderBy: { createdAt: 'desc' },
  });

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
