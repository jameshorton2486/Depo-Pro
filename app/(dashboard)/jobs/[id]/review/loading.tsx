export default function ReviewLoading() {
  return (
    <div className="h-screen bg-background">
      <div className="border-b border-border px-4 py-4">
        <div className="mb-2 h-6 w-64 animate-pulse rounded bg-muted" />
        <div className="h-4 w-40 animate-pulse rounded bg-muted/80" />
      </div>

      <div className="border-b border-border px-4 py-3">
        <div className="h-16 animate-pulse rounded-xl bg-muted" />
      </div>

      <div className="flex h-[calc(100vh-154px)]">
        <div className="w-2/3 border-r border-border p-4">
          <div className="space-y-3">
            <div className="h-4 w-11/12 animate-pulse rounded bg-muted" />
            <div className="h-4 w-10/12 animate-pulse rounded bg-muted/90" />
            <div className="h-4 w-9/12 animate-pulse rounded bg-muted/80" />
            <div className="h-4 w-11/12 animate-pulse rounded bg-muted" />
            <div className="h-4 w-8/12 animate-pulse rounded bg-muted/90" />
            <div className="h-4 w-10/12 animate-pulse rounded bg-muted/80" />
            <div className="h-4 w-7/12 animate-pulse rounded bg-muted" />
          </div>
        </div>

        <div className="w-1/3 p-4">
          <div className="mb-4 h-5 w-32 animate-pulse rounded bg-muted" />
          <div className="space-y-3">
            {[0, 1, 2, 3].map((card) => (
              <div key={card} className="rounded-xl border border-border bg-card p-3">
                <div className="mb-2 h-4 w-10/12 animate-pulse rounded bg-muted" />
                <div className="mb-3 h-3 w-6/12 animate-pulse rounded bg-muted/80" />
                <div className="flex gap-2">
                  <div className="h-8 flex-1 animate-pulse rounded bg-muted" />
                  <div className="h-8 flex-1 animate-pulse rounded bg-muted/90" />
                  <div className="h-8 flex-1 animate-pulse rounded bg-muted/80" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
