export default function Loading() {
  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 sm:py-12 animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <div className="size-11 rounded-xl bg-white/[0.04] animate-pulse" />
        <div className="space-y-2">
          <div className="h-5 bg-white/[0.04] rounded w-32 animate-pulse" />
          <div className="h-3 bg-white/[0.04] rounded w-56 animate-pulse" />
        </div>
      </div>

      {/* Capture cards */}
      <div className="space-y-3">
        {[1, 2, 3, 4, 5].map((i) => (
          <div
            key={i}
            className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-4 animate-pulse"
          >
            {/* Input + Status */}
            <div className="flex items-start justify-between gap-3 mb-3">
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-white/[0.04] rounded w-3/4" />
                <div className="h-3 bg-white/[0.04] rounded w-1/2" />
              </div>
              <div className="h-4 bg-white/[0.04] rounded w-16 shrink-0" />
            </div>

            {/* Module badges */}
            <div className="flex gap-1.5 mb-2">
              {[1, 2].map((j) => (
                <div
                  key={j}
                  className="h-5 bg-white/[0.04] rounded-md"
                  style={{ width: `${50 + j * 15}px` }}
                />
              ))}
            </div>

            {/* Timestamp */}
            <div className="h-3 bg-white/[0.04] rounded w-36" />
          </div>
        ))}
      </div>
    </div>
  );
}
