// =============================================================================
// CALENDAR PAGE (REDIRECT)
// app/calendar/page.tsx
//
// Redirects to calendar month view
// =============================================================================

import { redirect } from 'next/navigation';

export default function CalendarPage() {
  redirect('/calendar/month');
}
