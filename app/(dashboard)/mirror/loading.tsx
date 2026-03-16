export default function Loading() {
  return (
    <div className="p-8 max-w-5xl mx-auto space-y-10 animate-fade-in">
      {/* Header */}
      <div className="space-y-2">
        <div className="h-3 bg-white/[0.04] rounded w-36 animate-pulse" />
        <div className="h-8 bg-white/[0.04] rounded w-32 animate-pulse" />
        {/* 4 status pill skeletons */}
        <div className="flex gap-2 mt-3 flex-wrap">
          <div className="h-7 bg-white/[0.04] rounded-lg w-36 animate-pulse" />
          <div className="h-7 bg-white/[0.04] rounded-lg w-24 animate-pulse" />
          <div className="h-7 bg-white/[0.04] rounded-lg w-28 animate-pulse" />
          <div className="h-7 bg-white/[0.04] rounded-lg w-20 animate-pulse" />
        </div>
      </div>

      {/* Daily insight card skeleton */}
      <div className="space-y-3">
        <div className="h-3 bg-white/[0.04] rounded w-24 animate-pulse" />
        <div className="h-5 bg-white/[0.04] rounded w-36 animate-pulse" />
        <div className="glass-card rounded-2xl p-6 animate-pulse">
          <div className="space-y-4">
            <div className="h-5 bg-white/[0.04] rounded w-48" />
            <div className="h-4 bg-white/[0.04] rounded w-full" />
            <div className="h-4 bg-white/[0.04] rounded w-5/6" />
            <div className="h-4 bg-white/[0.04] rounded w-2/3" />
            <div className="flex gap-2 pt-2">
              <div className="h-5 bg-white/[0.04] rounded-lg w-20" />
              <div className="h-5 bg-white/[0.04] rounded-lg w-16" />
            </div>
          </div>
        </div>
      </div>

      {/* Mirror report skeleton */}
      <div className="space-y-3">
        <div className="h-3 bg-white/[0.04] rounded w-20 animate-pulse" />
        <div className="h-5 bg-white/[0.04] rounded w-32 animate-pulse" />
        <div className="glass-card rounded-2xl p-6 animate-pulse">
          <div className="space-y-4">
            <div className="h-4 bg-white/[0.04] rounded w-full" />
            <div className="h-4 bg-white/[0.04] rounded w-3/4" />
            <div className="h-4 bg-white/[0.04] rounded w-5/6" />
          </div>
        </div>
      </div>

      {/* Knowledge graph skeleton — large glass-card */}
      <div className="space-y-3">
        <div className="h-3 bg-white/[0.04] rounded w-28 animate-pulse" />
        <div className="h-5 bg-white/[0.04] rounded w-40 animate-pulse" />
        <div className="glass-card rounded-2xl p-6 animate-pulse">
          <div className="h-64 bg-white/[0.04] rounded-xl w-full" />
          <div className="grid grid-cols-3 gap-4 mt-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="space-y-2">
                <div className="h-3 bg-white/[0.04] rounded w-20" />
                <div className="h-4 bg-white/[0.04] rounded w-full" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
