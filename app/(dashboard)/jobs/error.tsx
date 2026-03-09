'use client';

export default function JobsError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex min-h-[320px] flex-col items-center justify-center gap-4 p-8 text-center">
      <h2 className="text-2xl font-semibold text-foreground">Unable to load jobs</h2>
      <p className="max-w-lg text-sm text-muted-foreground">
        Please refresh the page and try again. If the problem continues, check the health endpoint before retrying review work.
      </p>
      <button
        onClick={() => reset()}
        className="rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
      >
        Retry
      </button>
    </div>
  );
}
