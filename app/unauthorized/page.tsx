// =============================================================================
// UNAUTHORIZED PAGE
// app/unauthorized/page.tsx
//
// Unauthorized access page with role/scope error messages
// =============================================================================

'use client';

import { Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Lock, Shield, AlertCircle } from 'lucide-react';

function UnauthorizedContent() {
  const searchParams = useSearchParams();
  const reason = searchParams.get('reason');
  const role = searchParams.get('role');
  const caseId = searchParams.get('caseId');

  const getErrorMessage = () => {
    switch (reason) {
      case 'missing_role':
        return {
          title: 'Missing Role Assignment',
          message: 'Your account does not have a role assigned. Please contact your administrator.',
          icon: Shield,
        };
      case 'insufficient_role':
        return {
          title: 'Insufficient Permissions',
          message: `Your role (${role || 'unknown'}) does not have access to this page.`,
          icon: Lock,
        };
      case 'org_mismatch':
        return {
          title: 'Organization Access Denied',
          message: 'You do not have access to this organization.',
          icon: AlertCircle,
        };
      case 'case_access_denied':
        return {
          title: 'Case Access Denied',
          message: `You do not have access to case ${caseId || 'unknown'}.`,
          icon: Lock,
        };
      default:
        return {
          title: 'Unauthorized',
          message: 'You do not have permission to access this page.',
          icon: Lock,
        };
    }
  };

  const { title, message, icon: Icon } = getErrorMessage();

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center max-w-md px-4">
        <Icon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
        <h2 className="text-2xl font-bold mt-4 mb-2">{title}</h2>
        <p className="text-gray-600 mt-2 mb-6">{message}</p>
        <div className="space-y-3">
          <Link
            href="/login"
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-lg font-semibold transition-colors inline-block"
          >
            Sign In
          </Link>
          <div>
            <Link
              href="/dashboard"
              className="text-indigo-600 hover:text-indigo-700 text-sm font-medium"
            >
              Go to Dashboard
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function UnauthorizedPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    }>
      <UnauthorizedContent />
    </Suspense>
  );
}
