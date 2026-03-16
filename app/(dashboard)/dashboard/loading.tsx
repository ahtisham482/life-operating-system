export default function Loading() {
  return (
    <div className="p-8 max-w-5xl mx-auto space-y-12 animate-fade-in">
      {/* Pulse Score skeleton */}
      <div className="glass-card rounded-2xl p-8 text-center animate-pulse">
        <div className="h-3 bg-white/[0.04] rounded w-24 mx-auto mb-4" />
        <div className="w-24 h-24 rounded-full bg-white/[0.04] mx-auto" />
        <div className="h-3 bg-white/[0.04] rounded w-20 mx-auto mt-4" />
      </div>

      {/* Header + greeting skeleton */}
      <div className="space-y-6">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <div className="h-3 bg-white/[0.04] rounded w-36 animate-pulse" />
            <div className="h-8 bg-white/[0.04] rounded w-56 animate-pulse" />
            <div className="h-3 bg-white/[0.04] rounded w-48 animate-pulse" />
          </div>
          <div className="h-3 bg-white/[0.04] rounded w-28 animate-pulse" />
        </div>

        {/* Badge skeletons */}
        <div className="flex gap-3">
          <div className="h-7 bg-white/[0.04] rounded-lg w-32 animate-pulse" />
          <div className="h-7 bg-white/[0.04] rounded-lg w-20 animate-pulse" />
          <div className="h-7 bg-white/[0.04] rounded-lg w-28 animate-pulse" />
        </div>

        <div className="h-px bg-white/[0.05]" />
      </div>

      {/* Today's Focus section skeleton */}
      <div className="space-y-5">
        <div className="space-y-1">
          <div className="h-3 bg-white/[0.04] rounded w-16 animate-pulse" />
          <div className="h-5 bg-white/[0.04] rounded w-48 animate-pulse" />
        </div>
        <div className="glass-card rounded-2xl overflow-hidden animate-pulse">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className={`flex items-center gap-4 px-8 py-4 ${i > 1 ? "border-t border-white/[0.05]" : ""}`}
            >
              <div className="w-5 h-5 rounded bg-white/[0.04]" />
              <div className="h-4 bg-white/[0.04] rounded flex-1" />
              <div className="h-3 bg-white/[0.04] rounded w-20" />
            </div>
          ))}
        </div>
      </div>

      {/* Matrix Summary — 2-column grid */}
      <div className="space-y-5">
        <div className="space-y-1">
          <div className="h-3 bg-white/[0.04] rounded w-16 animate-pulse" />
          <div className="h-5 bg-white/[0.04] rounded w-40 animate-pulse" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="glass-card rounded-2xl p-8 animate-pulse">
              <div className="h-3 bg-white/[0.04] rounded w-24 mb-3" />
              <div className="h-10 bg-white/[0.04] rounded w-12" />
            </div>
          ))}
        </div>
      </div>

      {/* Quick Actions — 4 button skeletons */}
      <div className="space-y-5">
        <div className="space-y-1">
          <div className="h-3 bg-white/[0.04] rounded w-16 animate-pulse" />
          <div className="h-5 bg-white/[0.04] rounded w-28 animate-pulse" />
        </div>
        <div className="grid grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-12 bg-white/[0.04] rounded-2xl animate-pulse" />
          ))}
        </div>
      </div>
    </div>
  );
}
