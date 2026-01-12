// =============================================================================
// ACCEPT INVITE CLIENT COMPONENT
// app/auth/invite/accept/invite-accept-client.tsx
//
// Client component with useSearchParams hook
// =============================================================================

'use client';

import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { AlertCircle } from 'lucide-react';

export default function InviteAcceptClient() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8 text-center">
          <AlertCircle className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h1 className="text-2xl font-bold mb-4">Invalid Invitation</h1>
          <p className="text-gray-600 mb-6">
            This invitation link is invalid or has expired.
            Please contact your administrator.
          </p>
          <Link
            href="/contact"
            className="text-indigo-600 hover:text-indigo-700 font-semibold"
          >
            Contact Support
          </Link>
        </div>
      </div>
    );
  }

  // For v1.0, show coming soon message
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8 text-center">
        <AlertCircle className="w-16 h-16 text-yellow-500 mx-auto mb-4" />
        <h1 className="text-2xl font-bold mb-4">Invitation Acceptance</h1>
        <p className="text-gray-600 mb-6">
          User invitations are not yet available in beta.
          Please register directly or contact your administrator.
        </p>
        <div className="space-y-2">
          <Link
            href="/register"
            className="block bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-lg font-semibold transition-colors"
          >
            Register Account
          </Link>
          <Link
            href="/contact"
            className="block text-indigo-600 hover:text-indigo-700 font-semibold"
          >
            Contact Support
          </Link>
        </div>
      </div>
    </div>
  );
}
