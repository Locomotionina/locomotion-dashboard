export default function DashboardLoading() {
  return (
    <div className="py-4 space-y-6 animate-pulse">
      {/* User Header Skeleton */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-border/40">
        <div className="flex items-center gap-4">
          <div className="h-16 w-16 rounded-2xl bg-muted/70 ring-4 ring-muted/20" />
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <div className="h-6 w-44 bg-muted/80 rounded-lg" />
              <div className="h-5 w-16 bg-muted/60 rounded-full" />
            </div>
            <div className="h-4 w-32 bg-muted/50 rounded" />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-9 w-28 bg-muted/60 rounded-xl" />
          <div className="h-9 w-32 bg-muted/70 rounded-xl" />
        </div>
      </div>

      {/* 4 Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="rounded-2xl border border-border/50 bg-card/60 p-4 space-y-3"
          >
            <div className="flex items-center justify-between">
              <div className="h-4 w-20 bg-muted/70 rounded" />
              <div className="h-7 w-7 rounded-lg bg-muted/60" />
            </div>
            <div className="h-7 w-12 bg-muted/80 rounded" />
            <div className="h-3 w-28 bg-muted/40 rounded" />
          </div>
        ))}
      </div>

      {/* Tabs navigation skeleton */}
      <div className="flex items-center gap-2 border-b border-border/50 pb-2">
        <div className="h-9 w-32 bg-muted/80 rounded-xl" />
        <div className="h-9 w-28 bg-muted/50 rounded-xl" />
        <div className="h-9 w-28 bg-muted/50 rounded-xl" />
      </div>

      {/* Task Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div
            key={i}
            className="rounded-2xl border border-border/50 bg-card/60 p-4 space-y-3"
          >
            <div className="flex items-center justify-between">
              <div className="h-5 w-20 bg-muted/60 rounded-full" />
              <div className="h-4 w-12 bg-muted/50 rounded" />
            </div>
            <div className="h-5 w-3/4 bg-muted/80 rounded" />
            <div className="h-4 w-full bg-muted/40 rounded" />
            <div className="pt-2 flex items-center justify-between border-t border-border/30">
              <div className="h-4 w-24 bg-muted/50 rounded" />
              <div className="h-7 w-20 bg-muted/70 rounded-lg" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
