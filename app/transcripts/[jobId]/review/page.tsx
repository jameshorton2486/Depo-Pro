// =============================================================================
// TRANSCRIPT REVIEW PAGE
// app/transcripts/[jobId]/review/page.tsx
//
// Low-confidence word review workflow (stub - redirects to existing review page)
// =============================================================================

import { redirect } from 'next/navigation';

interface PageProps {
  params: Promise<{ jobId: string }>;
}

export default async function TranscriptReviewPage({ params }: PageProps) {
  const { jobId } = await params;
  // Redirect to existing review page
  redirect(`/jobs/${jobId}/review`);
}
