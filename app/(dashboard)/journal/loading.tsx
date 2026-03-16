export default function Loading() {
  return (
    <div className="p-8 max-w-5xl mx-auto space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <div className="h-3 bg-white/[0.04] rounded w-24 animate-pulse" />
          <div className="h-8 bg-white/[0.04] rounded w-36 animate-pulse" />
          <div className="h-3 bg-white/[0.04] rounded w-48 animate-pulse" />
        </div>
      </div>

      {/* Filter row */}
      <div className="flex gap-3">
        <div className="h-8 bg-white/[0.04] rounded-lg w-24 animate-pulse" />
        <div className="h-8 bg-white/[0.04] rounded-lg w-20 animate-pulse" />
        <div className="h-8 bg-white/[0.04] rounded-lg w-28 animate-pulse" />
      </div>

      {/* Journal card skeletons */}
      <div className="space-y-6">
        {[1, 2, 3].map((i) => (
          <div key={i} className="glass-card rounded-2xl p-6 animate-pulse">
            <div className="space-y-4">
              {/* Card header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-3 bg-white/[0.04] rounded w-24" />
                  <div className="h-5 bg-white/[0.04] rounded-lg w-16" />
                </div>
                <div className="h-5 bg-white/[0.04] rounded-lg w-20" />
              </div>
              {/* Text blocks */}
              <div className="space-y-2">
                <div className="h-4 bg-white/[0.04] rounded w-full" />
                <div className="h-4 bg-white/[0.04] rounded w-5/6" />
                <div className="h-4 bg-white/[0.04] rounded w-3/4" />
              </div>
              {/* Footer */}
              <div className="flex gap-2 pt-2">
                <div className="h-5 bg-white/[0.04] rounded-lg w-16" />
                <div className="h-5 bg-white/[0.04] rounded-lg w-20" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
