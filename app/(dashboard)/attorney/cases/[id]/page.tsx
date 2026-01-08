import { auth } from '@/lib/auth-compat';
import { db } from '@/lib/db';
import { notFound, redirect } from 'next/navigation';
import { CaseDetailView } from '@/components/attorney/case-detail-view';

interface Props {
  params: Promise<{ id: string }>;
}

export default async function AttorneyCaseDetailPage({ params }: Props) {
  const { id } = await params;
  const session = await auth();
  
  if (!session?.user?.id) {
    redirect('/login');
  }

  // Verify attorney has access to this case
  const caseAccess = await db.caseMembership.findFirst({
    where: {
      caseId: id,
      userId: session.user.id,
      roleInCase: { in: ['ATTORNEY', 'PARALEGAL'] },
    },
    include: {
      case: {
        include: {
          jobs: {
            include: {
              transcripts: true,
            },
            orderBy: { depositionDate: 'desc' },
          },
          attorneys: true,
          firm: {
            select: { id: true, name: true }
          }
        },
      },
    },
  });

  if (!caseAccess) {
    notFound();
  }

  // Get attorney's notes for this case
  const annotations = await db.transcriptNote.findMany({
    where: {
      userId: session.user.id,
      transcript: {
        job: { caseId: id },
      },
    },
    include: {
      transcript: {
        include: {
          job: {
            select: {
              caseName: true,
              caseNumber: true,
            },
          },
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  return (
    <CaseDetailView 
      caseData={caseAccess.case as any}
      roleInCase={caseAccess.roleInCase}
      annotations={annotations as any}
    />
  );
}
