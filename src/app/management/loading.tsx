export default function ManagementLoading() {
  return (
    <div className="py-4 space-y-8 animate-pulse">
      {/* Header Skeleton */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <div className="h-8 w-72 bg-muted/80 rounded-lg" />
            <div className="h-5 w-24 bg-muted/60 rounded-full" />
          </div>
          <div className="h-4 w-80 bg-muted/50 rounded" />
        </div>
        <div className="flex items-center gap-2">
          <div className="h-10 w-32 bg-muted/60 rounded-xl" />
          <div className="h-10 w-32 bg-muted/70 rounded-xl" />
        </div>
      </div>

      {/* Metric Cards Skeleton */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="rounded-2xl border border-border/50 bg-card/60 p-4 space-y-3"
          >
            <div className="flex items-center justify-between">
              <div className="h-4 w-24 bg-muted/70 rounded" />
              <div className="h-7 w-7 rounded-lg bg-muted/50" />
            </div>
            <div className="h-8 w-14 bg-muted/80 rounded" />
            <div className="h-3 w-28 bg-muted/40 rounded" />
          </div>
        ))}
      </div>

      {/* Staff Capacity Section Skeleton */}
      <div className="rounded-2xl border border-border/50 bg-card/60 p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="h-6 w-56 bg-muted/80 rounded" />
          <div className="h-8 w-32 bg-muted/50 rounded-xl" />
        </div>
        <div className="space-y-3 pt-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <div
              key={i}
              className="h-16 rounded-xl border border-border/40 bg-card/40 flex items-center justify-between px-4"
            >
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-muted/70" />
                <div className="space-y-1.5">
                  <div className="h-4 w-32 bg-muted/80 rounded" />
                  <div className="h-3 w-20 bg-muted/50 rounded" />
                </div>
              </div>
              <div className="h-6 w-24 bg-muted/60 rounded-full" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
