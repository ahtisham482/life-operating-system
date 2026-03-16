export default function Loading() {
  return (
    <div className="p-8 max-w-5xl mx-auto space-y-8 animate-fade-in">
      {/* Header with status dot */}
      <div className="space-y-2">
        <div className="h-3 bg-white/[0.04] rounded w-20 animate-pulse" />
        <div className="h-8 bg-white/[0.04] rounded w-44 animate-pulse" />
        <div className="h-3 bg-white/[0.04] rounded w-56 animate-pulse" />
        <div className="flex items-center gap-2 mt-2">
          <div className="size-2 rounded-full bg-white/[0.08] animate-pulse" />
          <div className="h-3 bg-white/[0.04] rounded w-28 animate-pulse" />
        </div>
      </div>

      {/* 2 engine summary card skeletons */}
      <div className="grid grid-cols-2 gap-4">
        {[1, 2].map((i) => (
          <div key={i} className="glass-card rounded-2xl p-6 animate-pulse">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="h-5 bg-white/[0.04] rounded w-40" />
                <div className="h-5 bg-white/[0.04] rounded-lg w-16" />
              </div>
              <div className="h-3 bg-white/[0.04] rounded w-full" />
              <div className="flex items-center gap-2 pt-1">
                <div className="h-3 bg-white/[0.04] rounded w-24" />
                <div className="h-3 bg-white/[0.04] rounded w-20" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Table: 4 row skeletons */}
      <div className="space-y-3">
        <div className="h-5 bg-white/[0.04] rounded w-28 animate-pulse" />
        <div className="glass-card rounded-2xl overflow-hidden animate-pulse">
          {/* Table header */}
          <div className="flex items-center gap-4 px-6 py-3 border-b border-white/[0.05]">
            <div className="h-3 bg-white/[0.04] rounded w-20" />
            <div className="h-3 bg-white/[0.04] rounded w-16" />
            <div className="h-3 bg-white/[0.04] rounded w-12 ml-auto" />
            <div className="h-3 bg-white/[0.04] rounded w-28" />
          </div>
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className={`flex items-center gap-4 px-6 py-4 ${i > 1 ? "border-t border-white/[0.05]" : ""}`}
            >
              <div className="h-4 bg-white/[0.04] rounded w-36" />
              <div className="h-5 bg-white/[0.04] rounded-lg w-16" />
              <div className="h-4 bg-white/[0.04] rounded flex-1" />
              <div className="h-3 bg-white/[0.04] rounded w-28" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
