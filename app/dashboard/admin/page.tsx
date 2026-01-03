// =============================================================================
// ADMIN DASHBOARD (REDIRECT)
// app/dashboard/admin/page.tsx
//
// Redirects to (dashboard)/admin
// =============================================================================

import { redirect } from 'next/navigation';

export default function AdminDashboardRedirectPage() {
  redirect('/admin');
}
