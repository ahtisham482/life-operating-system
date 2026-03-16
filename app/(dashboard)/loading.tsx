export default function Loading() {
  return (
    <div className="p-8 max-w-5xl mx-auto space-y-8 animate-fade-in">
      {/* Header skeleton */}
      <div className="space-y-3">
        <div className="h-3 bg-white/[0.04] rounded w-32 animate-pulse" />
        <div className="h-8 bg-white/[0.04] rounded w-56 animate-pulse" />
        <div className="h-3 bg-white/[0.04] rounded w-44 animate-pulse" />
      </div>

      {/* 3 glass-card skeletons */}
      <div className="glass-card rounded-2xl p-6 animate-pulse">
        <div className="space-y-3">
          <div className="h-3 bg-white/[0.04] rounded w-24" />
          <div className="h-5 bg-white/[0.04] rounded w-48" />
          <div className="h-3 bg-white/[0.04] rounded w-full" />
          <div className="h-3 bg-white/[0.04] rounded w-3/4" />
        </div>
      </div>

      <div className="glass-card rounded-2xl p-6 animate-pulse">
        <div className="space-y-3">
          <div className="h-3 bg-white/[0.04] rounded w-28" />
          <div className="h-5 bg-white/[0.04] rounded w-40" />
          <div className="h-3 bg-white/[0.04] rounded w-full" />
          <div className="h-3 bg-white/[0.04] rounded w-2/3" />
        </div>
      </div>

      <div className="glass-card rounded-2xl p-6 animate-pulse">
        <div className="space-y-3">
          <div className="h-3 bg-white/[0.04] rounded w-20" />
          <div className="h-5 bg-white/[0.04] rounded w-44" />
          <div className="h-3 bg-white/[0.04] rounded w-full" />
          <div className="h-3 bg-white/[0.04] rounded w-1/2" />
        </div>
      </div>
    </div>
  );
}
