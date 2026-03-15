// app/transcription-tool/page.tsx
// RETIRED — Audio upload is now part of the New Deposition wizard.
// This redirect preserves any bookmarks or links to the old route.

import { redirect } from 'next/navigation';

export default function TranscriptionToolPage() {
  redirect('/jobs/new');
}
