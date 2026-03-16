export default function Loading() {
  return (
    <div className="p-8 max-w-5xl mx-auto space-y-8 animate-fade-in">
      {/* Header + toggle skeleton */}
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <div className="h-3 bg-white/[0.04] rounded w-28 animate-pulse" />
          <div className="h-8 bg-white/[0.04] rounded w-52 animate-pulse" />
          <div className="h-3 bg-white/[0.04] rounded w-64 animate-pulse" />
        </div>
        <div className="h-8 bg-white/[0.04] rounded-lg w-28 animate-pulse" />
      </div>

      {/* 4 quadrant sections */}
      <div className="grid grid-cols-2 gap-6">
        {[
          { label: "Q1 — Do Now", color: "rgba(239, 68, 68, 0.3)" },
          { label: "Q2 — Schedule", color: "rgba(234, 179, 8, 0.3)" },
          { label: "Q3 — Delegate", color: "rgba(59, 130, 246, 0.3)" },
          { label: "Q4 — Eliminate", color: "rgba(255, 255, 255, 0.12)" },
        ].map(({ label, color }) => (
          <div key={label} className="glass-card rounded-2xl overflow-hidden animate-pulse">
            {/* Quadrant header */}
            <div
              className="px-6 py-3 border-b border-white/[0.05]"
              style={{ borderLeftWidth: 3, borderLeftColor: color }}
            >
              <div className="h-3 bg-white/[0.04] rounded w-28" />
            </div>
            {/* Task row skeletons */}
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className={`flex items-center gap-4 px-6 py-3 ${i > 1 ? "border-t border-white/[0.05]" : ""}`}
              >
                <div className="w-4 h-4 rounded bg-white/[0.04]" />
                <div className="h-4 bg-white/[0.04] rounded flex-1" />
                <div className="h-3 bg-white/[0.04] rounded w-16" />
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
