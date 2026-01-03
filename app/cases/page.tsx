// =============================================================================
// CASES PAGE (REDIRECT)
// app/cases/page.tsx
//
// Redirects to jobs for now
// =============================================================================

import { redirect } from 'next/navigation';

export default function CasesPage() {
  redirect('/dashboard/reporter/jobs');
}
