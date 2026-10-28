export default function AdminUsersLoading() {
  return (
    <div className="py-4 space-y-6 animate-pulse">
      {/* Header Skeleton */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-border/40">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <div className="h-8 w-60 bg-muted/80 rounded-lg" />
            <div className="h-5 w-20 bg-muted/60 rounded-full" />
          </div>
          <div className="h-4 w-72 bg-muted/50 rounded" />
        </div>
        <div className="h-10 w-36 bg-muted/70 rounded-xl" />
      </div>

      {/* Directory Table Skeleton */}
      <div className="rounded-2xl border border-border/50 bg-card/60 p-4 space-y-3">
        <div className="h-10 w-full bg-muted/50 rounded-xl mb-4" />
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div
            key={i}
            className="h-14 rounded-xl border border-border/30 bg-muted/20 flex items-center justify-between px-4"
          >
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-full bg-muted/60" />
              <div className="space-y-1">
                <div className="h-4 w-28 bg-muted/70 rounded" />
                <div className="h-3 w-16 bg-muted/40 rounded" />
              </div>
            </div>
            <div className="h-6 w-20 bg-muted/50 rounded-full" />
          </div>
        ))}
      </div>
    </div>
  );
}
