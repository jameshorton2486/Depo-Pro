// =============================================================================
// ACCEPT INVITE CLIENT COMPONENT
// app/auth/invite/accept/invite-accept-client.tsx
//
// Client component with useSearchParams hook
// =============================================================================

'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { AlertCircle } from 'lucide-react';

function InviteAcceptContent() {
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
        <AlertCircle className="w-16 h-16 text-indigo-500 mx-auto mb-4" />
        <h1 className="text-2xl font-bold mb-4">Welcome to Depo-Pro Beta</h1>
        <p className="text-gray-600 mb-6">
          Welcome to the Depo-Pro beta! Please register for an account below. Your administrator will assign your role after registration.
        </p>
        <div className="space-y-2">
          <Link
            href="/register"
            className="block bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-lg font-semibold transition-colors"
          >
            Register Account
          </Link>
          <p className="text-sm text-gray-600">
            Already have an account?{' '}
            <Link href="/login" className="text-indigo-600 hover:text-indigo-700 font-semibold">
              Log in
            </Link>
          </p>
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

export default function InviteAcceptClient() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    }>
      <InviteAcceptContent />
    </Suspense>
  );
}
