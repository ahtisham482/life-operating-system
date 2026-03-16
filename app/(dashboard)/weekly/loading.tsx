export default function Loading() {
  return (
    <div className="p-8 max-w-3xl mx-auto space-y-12 animate-fade-in">
      {/* Header with week label */}
      <div className="space-y-3">
        <div className="h-3 bg-white/[0.04] rounded w-28 animate-pulse" />
        <div className="h-8 bg-white/[0.04] rounded w-48 animate-pulse" />
        <div className="h-3 bg-white/[0.04] rounded w-52 animate-pulse" />
        <div className="h-px bg-white/[0.05] mt-5" />
      </div>

      {/* Progress bar skeleton */}
      <div className="space-y-3">
        <div className="flex justify-between">
          <div className="h-3 bg-white/[0.04] rounded w-24 animate-pulse" />
          <div className="h-3 bg-white/[0.04] rounded w-12 animate-pulse" />
        </div>
        <div className="h-2 bg-white/[0.04] rounded-full w-full animate-pulse" />
      </div>

      {/* Question/textarea cards */}
      {[1, 2, 3].map((i) => (
        <div key={i} className="space-y-3">
          <div className="h-3 bg-white/[0.04] rounded w-16 animate-pulse" />
          <div className="h-5 bg-white/[0.04] rounded w-56 animate-pulse" />
          <div className="glass-card rounded-2xl p-6 animate-pulse">
            <div className="space-y-3">
              <div className="h-4 bg-white/[0.04] rounded w-full" />
              <div className="h-4 bg-white/[0.04] rounded w-3/4" />
              <div className="h-4 bg-white/[0.04] rounded w-1/2" />
              <div className="h-20 bg-white/[0.04] rounded-xl w-full mt-2" />
            </div>
          </div>
        </div>
      ))}

      {/* Task list skeleton */}
      <div className="space-y-4">
        <div className="h-3 bg-white/[0.04] rounded w-20 animate-pulse" />
        <div className="h-5 bg-white/[0.04] rounded w-36 animate-pulse" />
        <div className="glass-card rounded-2xl overflow-hidden animate-pulse">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className={`flex items-center gap-4 px-6 py-4 ${i > 1 ? "border-t border-white/[0.05]" : ""}`}
            >
              <div className="w-5 h-5 rounded bg-white/[0.04]" />
              <div className="h-4 bg-white/[0.04] rounded flex-1" />
              <div className="h-3 bg-white/[0.04] rounded w-20" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
