'use client';

import Link from 'next/link';

export default function ReviewPageError({
  error: _error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const isDevelopmentHost =
    typeof window !== 'undefined' &&
    (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');

  if (isDevelopmentHost) {
    console.error('[review:error]', _error);
  }

  return (
    <div className="flex min-h-[400px] flex-col items-center justify-center gap-4 p-8 text-center">
      <div className="rounded-full border border-blue-500/30 bg-blue-500/10 px-3 py-1 text-xs font-medium uppercase tracking-[0.2em] text-blue-300">
        Depo-Pro Review
      </div>
      <div>
        <h2 className="mb-2 text-2xl font-semibold text-foreground">Unable to load this review page</h2>
        <p className="max-w-xl text-sm text-muted-foreground">
          Your corrections have been saved. Try the page again, or return to jobs and reopen the review session.
        </p>
      </div>
      <div className="flex gap-3">
        <button
          onClick={() => reset()}
          className="rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
        >
          Try Again
        </button>
        <Link
          href="/jobs"
          className="rounded border border-border px-4 py-2 text-sm text-foreground transition-colors hover:bg-muted"
        >
          Return to Jobs
        </Link>
      </div>
    </div>
  );
}

