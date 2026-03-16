export default function Loading() {
  return (
    <div className="p-8 max-w-3xl mx-auto space-y-12 animate-fade-in">
      {/* Header */}
      <div className="space-y-3">
        <div className="h-3 bg-white/[0.04] rounded w-28 animate-pulse" />
        <div className="h-8 bg-white/[0.04] rounded w-48 animate-pulse" />
        <div className="h-3 bg-white/[0.04] rounded w-64 animate-pulse" />
        <div className="h-px bg-white/[0.05] mt-5" />
      </div>

      {/* Morning group */}
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="h-3 bg-white/[0.04] rounded w-16 animate-pulse" />
          <div className="h-5 bg-white/[0.04] rounded w-32 animate-pulse" />
        </div>
        <div className="glass-card rounded-2xl p-6 animate-pulse">
          <div className="space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex items-center gap-4">
                <div className="w-5 h-5 rounded border border-white/[0.08] bg-white/[0.04]" />
                <div className="h-4 bg-white/[0.04] rounded w-32" />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Daytime group */}
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="h-3 bg-white/[0.04] rounded w-16 animate-pulse" />
          <div className="h-5 bg-white/[0.04] rounded w-28 animate-pulse" />
        </div>
        <div className="glass-card rounded-2xl p-6 animate-pulse">
          <div className="space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex items-center gap-4">
                <div className="w-5 h-5 rounded border border-white/[0.08] bg-white/[0.04]" />
                <div className="h-4 bg-white/[0.04] rounded w-28" />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Evening group */}
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="h-3 bg-white/[0.04] rounded w-16 animate-pulse" />
          <div className="h-5 bg-white/[0.04] rounded w-24 animate-pulse" />
        </div>
        <div className="glass-card rounded-2xl p-6 animate-pulse">
          <div className="space-y-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="flex items-center gap-4">
                <div className="w-5 h-5 rounded border border-white/[0.08] bg-white/[0.04]" />
                <div className="h-4 bg-white/[0.04] rounded w-36" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
