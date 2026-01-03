// =============================================================================
// NEW CASE PAGE (REDIRECT)
// app/cases/new/page.tsx
//
// Redirects to transcription upload
// =============================================================================

import { redirect } from 'next/navigation';

export default function NewCasePage() {
  redirect('/transcription/upload');
}
