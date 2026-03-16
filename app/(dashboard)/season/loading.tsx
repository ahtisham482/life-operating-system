export default function Loading() {
  return (
    <div className="p-8 max-w-5xl mx-auto space-y-12 animate-fade-in">
      {/* Header */}
      <div className="space-y-3">
        <div className="h-3 bg-white/[0.04] rounded w-28 animate-pulse" />
        <div className="h-8 bg-white/[0.04] rounded w-52 animate-pulse" />
        <div className="h-3 bg-white/[0.04] rounded w-64 animate-pulse" />
        <div className="h-px bg-white/[0.05] mt-5" />
      </div>

      {/* Goal card — large glass-card */}
      <div className="glass-card rounded-2xl p-8 animate-pulse">
        <div className="space-y-4">
          <div className="h-3 bg-white/[0.04] rounded w-20" />
          <div className="h-6 bg-white/[0.04] rounded w-72" />
          <div className="h-4 bg-white/[0.04] rounded w-full" />
          <div className="h-4 bg-white/[0.04] rounded w-3/4" />
          <div className="flex gap-3 mt-4">
            <div className="h-7 bg-white/[0.04] rounded-lg w-24" />
            <div className="h-7 bg-white/[0.04] rounded-lg w-20" />
          </div>
        </div>
      </div>

      {/* 3-column metrics grid */}
      <div className="grid grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="glass-card rounded-2xl p-6 text-center animate-pulse">
            <div className="h-3 bg-white/[0.04] rounded w-20 mx-auto mb-3" />
            <div className="h-8 bg-white/[0.04] rounded w-16 mx-auto mb-2" />
            <div className="h-3 bg-white/[0.04] rounded w-12 mx-auto" />
          </div>
        ))}
      </div>

      {/* Domain list — 6 small card skeletons */}
      <div className="space-y-4">
        <div className="h-3 bg-white/[0.04] rounded w-16 animate-pulse" />
        <div className="h-5 bg-white/[0.04] rounded w-32 animate-pulse" />
        <div className="grid grid-cols-2 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="glass-card rounded-2xl p-5 animate-pulse">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-6 h-6 rounded bg-white/[0.04]" />
                <div className="h-4 bg-white/[0.04] rounded w-32" />
              </div>
              <div className="h-3 bg-white/[0.04] rounded w-full" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
