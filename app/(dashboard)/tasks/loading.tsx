export default function Loading() {
  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <div className="h-3 bg-white/[0.04] rounded w-28 animate-pulse" />
          <div className="h-8 bg-white/[0.04] rounded w-44 animate-pulse" />
          <div className="h-3 bg-white/[0.04] rounded w-32 animate-pulse" />
        </div>
        <div className="h-9 bg-white/[0.04] rounded-lg w-28 animate-pulse" />
      </div>

      {/* Filter row */}
      <div className="flex gap-1.5">
        {[1, 2, 3, 4, 5].map((i) => (
          <div
            key={i}
            className="h-8 bg-white/[0.04] rounded-lg animate-pulse"
            style={{ width: `${60 + i * 10}px` }}
          />
        ))}
      </div>

      <div className="h-px bg-white/[0.04]" />

      {/* Kanban columns skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {["To Do", "In Progress", "Done"].map((col) => (
          <div key={col} className="glass-card rounded-2xl min-h-[300px]">
            {/* Column header */}
            <div className="px-5 py-4 border-b border-white/[0.04] flex items-center justify-between">
              <div className="h-4 bg-white/[0.04] rounded w-20 animate-pulse" />
              <div className="h-5 bg-white/[0.04] rounded-full w-6 animate-pulse" />
            </div>
            {/* Card skeletons */}
            <div className="p-3 space-y-2">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="glass-card rounded-xl p-3 animate-pulse"
                >
                  <div className="flex items-start gap-2">
                    <div className="w-4 h-4 rounded bg-white/[0.04] mt-0.5" />
                    <div className="flex-1 space-y-2">
                      <div className="h-4 bg-white/[0.04] rounded w-3/4" />
                      <div className="h-3 bg-white/[0.04] rounded w-1/2" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
