'use client';

import Link from 'next/link';

export default function Error({
  error: _error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 px-6 py-16 text-slate-100">
      <div className="w-full max-w-xl rounded-3xl border border-slate-800 bg-slate-900/80 p-10 text-center shadow-2xl">
        <p className="mb-3 text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">Depo-Pro</p>
        <h1 className="mb-3 text-3xl font-semibold">Something went wrong. Our team has been notified.</h1>
        <p className="mb-6 text-sm text-slate-400">
          You can try the request again now, or return to the dashboard and resume from there.
        </p>
        <div className="flex justify-center gap-3">
          <button
            onClick={() => reset()}
            className="rounded-xl bg-emerald-500 px-4 py-2 font-medium text-slate-950 transition-colors hover:bg-emerald-400"
          >
            Try Again
          </button>
          <Link
            href="/dashboard"
            className="rounded-xl border border-slate-700 px-4 py-2 font-medium text-slate-100 transition-colors hover:bg-slate-800"
          >
            Back to Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
