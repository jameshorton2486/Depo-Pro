// =============================================================================
// REGISTER PAGE (REDIRECT)
// app/register/page.tsx
//
// Redirects to /auth/register
// =============================================================================

import { redirect } from 'next/navigation';

export default function RegisterRedirectPage() {
  redirect('/auth/register');
}
