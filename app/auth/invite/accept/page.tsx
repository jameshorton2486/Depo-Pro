// =============================================================================
// ACCEPT INVITE PAGE
// app/auth/invite/accept/page.tsx
//
// Invitation acceptance form (stub for v1.0)
// =============================================================================

import { Suspense } from 'react';
import InviteAcceptClient from './invite-accept-client';

export default function AcceptInvitePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
          <p className="mt-4 text-gray-600">Loading invitation...</p>
        </div>
      </div>
    }>
      <InviteAcceptClient />
    </Suspense>
  );
}
