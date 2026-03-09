// =============================================================================
// TRANSCRIPT FINALIZE PAGE
// app/transcripts/[jobId]/finalize/page.tsx
//
// Auth-guarded server wrapper for finalize workflow
// =============================================================================

import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth/session';
import { TranscriptFinalizeClient } from './transcript-finalize-client';

export const dynamic = 'force-dynamic';

export default async function TranscriptFinalizePage() {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    redirect('/login');
  }

  return <TranscriptFinalizeClient />;
}
