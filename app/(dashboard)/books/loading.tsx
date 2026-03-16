export default function Loading() {
  return (
    <div className="p-8 max-w-5xl mx-auto space-y-8 animate-fade-in">
      {/* Header */}
      <div className="space-y-2">
        <div className="h-3 bg-white/[0.04] rounded w-28 animate-pulse" />
        <div className="h-8 bg-white/[0.04] rounded w-36 animate-pulse" />
        <div className="h-3 bg-white/[0.04] rounded w-56 animate-pulse" />
      </div>

      {/* 2x3 grid of book card skeletons */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="glass-card rounded-2xl p-6 animate-pulse">
            <div className="space-y-4">
              {/* Book cover placeholder */}
              <div className="h-32 bg-white/[0.04] rounded-xl w-full" />
              {/* Title */}
              <div className="h-5 bg-white/[0.04] rounded w-3/4" />
              {/* Author */}
              <div className="h-3 bg-white/[0.04] rounded w-1/2" />
              {/* Status badge */}
              <div className="flex items-center justify-between pt-1">
                <div className="h-5 bg-white/[0.04] rounded-lg w-20" />
                <div className="h-3 bg-white/[0.04] rounded w-12" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
