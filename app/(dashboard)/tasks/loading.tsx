export default function Loading() {
  return (
    <div className="p-8 max-w-5xl mx-auto space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <div className="h-3 bg-white/[0.04] rounded w-28 animate-pulse" />
          <div className="h-8 bg-white/[0.04] rounded w-44 animate-pulse" />
          <div className="h-3 bg-white/[0.04] rounded w-56 animate-pulse" />
        </div>
      </div>

      {/* Quick-add input skeleton */}
      <div className="h-10 bg-white/[0.04] rounded-xl w-full animate-pulse" />

      {/* Filter row */}
      <div className="flex gap-3">
        <div className="h-8 bg-white/[0.04] rounded-lg w-20 animate-pulse" />
        <div className="h-8 bg-white/[0.04] rounded-lg w-24 animate-pulse" />
        <div className="h-8 bg-white/[0.04] rounded-lg w-20 animate-pulse" />
        <div className="h-8 bg-white/[0.04] rounded-lg w-16 animate-pulse" />
      </div>

      {/* Task rows */}
      <div className="glass-card rounded-2xl overflow-hidden animate-pulse">
        {/* Table header */}
        <div className="flex items-center gap-4 px-6 py-3 border-b border-white/[0.05]">
          <div className="h-3 bg-white/[0.04] rounded w-16" />
          <div className="h-3 bg-white/[0.04] rounded w-12 ml-auto" />
          <div className="h-3 bg-white/[0.04] rounded w-16" />
          <div className="h-3 bg-white/[0.04] rounded w-12" />
        </div>
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div
            key={i}
            className={`flex items-center gap-4 px-6 py-4 ${i > 1 ? "border-t border-white/[0.05]" : ""}`}
          >
            <div className="w-5 h-5 rounded bg-white/[0.04]" />
            <div className="h-4 bg-white/[0.04] rounded flex-1" />
            <div className="h-3 bg-white/[0.04] rounded w-20" />
            <div className="h-5 bg-white/[0.04] rounded-lg w-16" />
          </div>
        ))}
      </div>
    </div>
  );
}
