export default function ProfileLoading() {
  return (
    <div className="max-w-4xl mx-auto py-6 space-y-6 animate-pulse">
      {/* Header Profile Skeleton */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-4 pb-4 border-b border-border/40">
        <div className="h-20 w-20 rounded-2xl bg-muted/70 ring-4 ring-muted/20" />
        <div className="space-y-2">
          <div className="h-7 w-48 bg-muted/80 rounded-lg" />
          <div className="h-4 w-32 bg-muted/50 rounded" />
        </div>
      </div>

      {/* Form Card Skeleton */}
      <div className="rounded-2xl border border-border/50 bg-card/60 p-6 space-y-5">
        <div className="h-5 w-40 bg-muted/80 rounded" />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
          <div className="space-y-2">
            <div className="h-4 w-20 bg-muted/60 rounded" />
            <div className="h-10 w-full bg-muted/40 rounded-xl" />
          </div>
          <div className="space-y-2">
            <div className="h-4 w-20 bg-muted/60 rounded" />
            <div className="h-10 w-full bg-muted/40 rounded-xl" />
          </div>
        </div>
        <div className="space-y-2 pt-2">
          <div className="h-4 w-24 bg-muted/60 rounded" />
          <div className="h-24 w-full bg-muted/30 rounded-xl" />
        </div>
        <div className="pt-4 flex justify-end">
          <div className="h-10 w-36 bg-muted/70 rounded-xl" />
        </div>
      </div>
    </div>
  );
}
