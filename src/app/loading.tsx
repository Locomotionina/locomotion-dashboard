export default function GlobalLoading() {
  return (
    <div className="w-full max-w-7xl mx-auto py-6 space-y-6 animate-pulse">
      {/* Top Banner Skeleton */}
      <div className="h-10 w-64 bg-muted/60 rounded-xl" />

      {/* Metrics Row Skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="h-28 rounded-2xl border border-border/50 bg-card/50 p-4 space-y-3"
          >
            <div className="h-4 w-24 bg-muted/70 rounded" />
            <div className="h-8 w-16 bg-muted/50 rounded" />
          </div>
        ))}
      </div>

      {/* Main Content Area Skeleton */}
      <div className="h-96 rounded-2xl border border-border/50 bg-card/30 p-6 space-y-4">
        <div className="h-6 w-48 bg-muted/70 rounded" />
        <div className="h-4 w-72 bg-muted/50 rounded" />
        <div className="space-y-3 pt-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-16 rounded-xl bg-muted/40" />
          ))}
        </div>
      </div>
    </div>
  );
}
