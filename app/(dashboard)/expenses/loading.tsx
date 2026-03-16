export default function Loading() {
  return (
    <div className="p-8 max-w-5xl mx-auto space-y-8 animate-fade-in">
      {/* Header */}
      <div className="space-y-2">
        <div className="h-3 bg-white/[0.04] rounded w-28 animate-pulse" />
        <div className="h-8 bg-white/[0.04] rounded w-44 animate-pulse" />
        <div className="h-3 bg-white/[0.04] rounded w-56 animate-pulse" />
      </div>

      {/* Quick entry grid: 2 rows x 4 */}
      <div className="space-y-3">
        <div className="h-3 bg-white/[0.04] rounded w-24 animate-pulse" />
        <div className="grid grid-cols-4 gap-3">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <div key={i} className="h-10 bg-white/[0.04] rounded-xl animate-pulse" />
          ))}
        </div>
      </div>

      {/* 3-column stats row */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Today", w: "w-20" },
          { label: "This Month", w: "w-24" },
          { label: "Need vs Desire", w: "w-28" },
        ].map(({ label, w }) => (
          <div key={label} className="glass-card rounded-2xl p-6 text-center animate-pulse">
            <div className="h-3 bg-white/[0.04] rounded w-20 mx-auto mb-3" />
            <div className={`h-8 bg-white/[0.04] rounded ${w} mx-auto mb-2`} />
            <div className="h-3 bg-white/[0.04] rounded w-12 mx-auto" />
          </div>
        ))}
      </div>

      {/* Table skeleton */}
      <div className="glass-card rounded-2xl overflow-hidden animate-pulse">
        {/* Table header */}
        <div className="flex items-center gap-4 px-6 py-3 border-b border-white/[0.05]">
          <div className="h-3 bg-white/[0.04] rounded w-20" />
          <div className="h-3 bg-white/[0.04] rounded w-16 ml-auto" />
          <div className="h-3 bg-white/[0.04] rounded w-20" />
          <div className="h-3 bg-white/[0.04] rounded w-16" />
          <div className="h-3 bg-white/[0.04] rounded w-12" />
        </div>
        {[1, 2, 3, 4, 5].map((i) => (
          <div
            key={i}
            className={`flex items-center gap-4 px-6 py-4 ${i > 1 ? "border-t border-white/[0.05]" : ""}`}
          >
            <div className="h-4 bg-white/[0.04] rounded w-24" />
            <div className="h-4 bg-white/[0.04] rounded flex-1" />
            <div className="h-5 bg-white/[0.04] rounded-lg w-20" />
            <div className="h-4 bg-white/[0.04] rounded w-16" />
            <div className="h-4 bg-white/[0.04] rounded w-12" />
          </div>
        ))}
      </div>
    </div>
  );
}
