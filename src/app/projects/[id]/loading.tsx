export default function ProjectDetailLoading() {
  return (
    <div className="space-y-8 py-4 animate-pulse">
      {/* Breadcrumb Skeleton */}
      <div className="flex items-center gap-2">
        <div className="h-4 w-36 bg-muted/60 rounded" />
        <span className="text-muted/40">/</span>
        <div className="h-4 w-20 bg-muted/70 rounded" />
      </div>

      {/* Hero Header Skeleton */}
      <div className="rounded-2xl border border-border/50 bg-card/60 p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <div className="h-7 w-60 bg-muted/80 rounded-lg" />
              <div className="h-5 w-20 bg-muted/60 rounded-full" />
            </div>
            <div className="h-4 w-44 bg-muted/50 rounded" />
          </div>
          <div className="h-9 w-32 bg-muted/70 rounded-xl" />
        </div>
        <div className="pt-2">
          <div className="h-3 w-full bg-muted/40 rounded-full" />
        </div>
      </div>

      {/* Deliverables Grid Skeleton */}
      <div className="space-y-3">
        <div className="h-6 w-48 bg-muted/80 rounded" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="h-36 rounded-2xl border border-border/50 bg-card/50 p-4 space-y-3"
            >
              <div className="h-4 w-24 bg-muted/70 rounded" />
              <div className="h-4 w-full bg-muted/40 rounded" />
              <div className="h-8 w-20 bg-muted/60 rounded-lg pt-2" />
            </div>
          ))}
        </div>
      </div>

      {/* Team Roster & Tasks Skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 rounded-2xl border border-border/50 bg-card/50 p-5 space-y-3">
          <div className="h-5 w-32 bg-muted/80 rounded" />
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-center gap-3 pt-2">
              <div className="h-9 w-9 rounded-full bg-muted/60" />
              <div className="space-y-1">
                <div className="h-4 w-28 bg-muted/70 rounded" />
                <div className="h-3 w-16 bg-muted/40 rounded" />
              </div>
            </div>
          ))}
        </div>
        <div className="lg:col-span-2 rounded-2xl border border-border/50 bg-card/50 p-5 space-y-3">
          <div className="h-5 w-36 bg-muted/80 rounded" />
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-16 rounded-xl bg-muted/30 p-3" />
          ))}
        </div>
      </div>
    </div>
  );
}
