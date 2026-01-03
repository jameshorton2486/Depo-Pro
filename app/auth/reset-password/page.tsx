// =============================================================================
// RESET PASSWORD PAGE
// app/auth/reset-password/page.tsx
//
// Password reset form (stub for v1.0)
// =============================================================================

'use client';

import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { AlertCircle } from 'lucide-react';

export default function ResetPasswordPage() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8 text-center">
          <AlertCircle className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h1 className="text-2xl font-bold mb-4">Invalid Reset Link</h1>
          <p className="text-gray-600 mb-6">
            This password reset link is invalid or has expired.
          </p>
          <Link
            href="/auth/forgot-password"
            className="text-indigo-600 hover:text-indigo-700 font-semibold"
          >
            Request New Link
          </Link>
        </div>
      </div>
    );
  }

  // For v1.0, show contact admin message
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8 text-center">
        <AlertCircle className="w-16 h-16 text-yellow-500 mx-auto mb-4" />
        <h1 className="text-2xl font-bold mb-4">Password Reset</h1>
        <p className="text-gray-600 mb-6">
          Password reset via email is not yet available in beta. 
          Please contact your administrator to reset your password.
        </p>
        <div className="space-y-2">
          <Link
            href="/contact"
            className="block bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-lg font-semibold transition-colors"
          >
            Contact Support
          </Link>
          <Link
            href="/auth/login"
            className="block text-indigo-600 hover:text-indigo-700 font-semibold"
          >
            Back to Login
          </Link>
        </div>
      </div>
    </div>
  );
}
