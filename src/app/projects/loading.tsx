export default function ProjectsLoading() {
  return (
    <div className="py-4 space-y-8 animate-pulse">
      {/* Top Header Skeleton */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <div className="h-8 w-64 bg-muted/80 rounded-lg" />
            <div className="h-5 w-24 bg-muted/60 rounded-full" />
          </div>
          <div className="h-4 w-96 bg-muted/50 rounded" />
        </div>
        <div className="h-10 w-36 bg-muted/70 rounded-xl" />
      </div>

      {/* Filter / Search Bar Skeleton */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-2xl border border-border/50 bg-card/40">
        <div className="h-9 w-64 bg-muted/60 rounded-xl" />
        <div className="flex items-center gap-2">
          <div className="h-9 w-24 bg-muted/60 rounded-xl" />
          <div className="h-9 w-24 bg-muted/60 rounded-xl" />
        </div>
      </div>

      {/* Projects Grid Skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div
            key={i}
            className="rounded-2xl border border-border/50 bg-card/60 p-5 space-y-4"
          >
            <div className="flex items-center justify-between">
              <div className="h-5 w-16 bg-muted/70 rounded-full" />
              <div className="h-5 w-20 bg-muted/50 rounded-full" />
            </div>
            <div className="h-6 w-3/4 bg-muted/80 rounded" />
            <div className="h-4 w-32 bg-muted/40 rounded" />
            <div className="h-2 w-full bg-muted/30 rounded-full" />
            <div className="pt-3 flex items-center justify-between border-t border-border/30">
              <div className="flex -space-x-2">
                <div className="h-7 w-7 rounded-full bg-muted/60 ring-2 ring-background" />
                <div className="h-7 w-7 rounded-full bg-muted/50 ring-2 ring-background" />
              </div>
              <div className="h-4 w-20 bg-muted/50 rounded" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
