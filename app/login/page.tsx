// =============================================================================
// LOGIN PAGE (REDIRECT)
// app/login/page.tsx
//
// Redirects to /auth/login
// =============================================================================

import { redirect } from 'next/navigation';

export default function LoginRedirectPage() {
  redirect('/auth/login');
}
