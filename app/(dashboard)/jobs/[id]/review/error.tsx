'use client';

export default function ReviewPageError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex min-h-[400px] flex-col items-center justify-center p-8">
      <h2 className="mb-2 text-xl font-semibold text-gray-200">Review Page Error</h2>
      <p className="mb-4 text-gray-400">{error.message}</p>
      <button
        onClick={() => reset()}
        className="rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
      >
        Try Again
      </button>
    </div>
  );
}

