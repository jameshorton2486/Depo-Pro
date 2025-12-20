// ═══════════════════════════════════════════════════════════════
// ERROR BOUNDARY
// ═══════════════════════════════════════════════════════════════
// Global error handling page

'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { useEffect } from 'react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to console in development
    console.error('Error caught by boundary:', error);

    // In production, you could send this to an error tracking service
    // e.g., Sentry, LogRocket, etc.
    if (process.env.NODE_ENV === 'production') {
      // logErrorToService(error);
    }
  }, [error]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md text-center space-y-6">
        <div className="text-6xl">⚠️</div>
        <h1 className="text-3xl font-bold text-gray-900">
          Something went wrong
        </h1>
        <p className="text-gray-600">
          {error.message || 'An unexpected error occurred. Please try again.'}
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
          <Button onClick={reset}>
            Try Again
          </Button>
          <Button asChild variant="outline">
            <Link href="/dashboard">
              Back to Dashboard
            </Link>
          </Button>
        </div>
        {error.digest && (
          <p className="text-xs text-gray-400 pt-4">
            Error ID: {error.digest}
          </p>
        )}
      </div>
    </div>
  );
}
