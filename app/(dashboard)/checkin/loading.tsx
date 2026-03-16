export default function Loading() {
  return (
    <div className="p-8 max-w-3xl mx-auto space-y-12 animate-fade-in">
      {/* Header */}
      <div className="space-y-3">
        <div className="h-3 bg-white/[0.04] rounded w-28 animate-pulse" />
        <div className="h-8 bg-white/[0.04] rounded w-40 animate-pulse" />
        <div className="h-3 bg-white/[0.04] rounded w-56 animate-pulse" />
        <div className="h-px bg-white/[0.05] mt-5" />
      </div>

      {/* 7-Day Execution Track */}
      <div className="space-y-4">
        <div className="h-3 bg-white/[0.04] rounded w-20 animate-pulse" />
        <div className="h-5 bg-white/[0.04] rounded w-48 animate-pulse" />
        <div className="glass-card rounded-2xl p-8 animate-pulse">
          <div className="flex gap-3 items-center">
            {[1, 2, 3, 4, 5, 6, 7].map((i) => (
              <div key={i} className="text-center">
                <div className="size-10 rounded-xl bg-white/[0.04]" />
                <div className="h-2 bg-white/[0.04] rounded w-6 mx-auto mt-2" />
              </div>
            ))}
            <div className="ml-auto px-5 py-2.5 rounded-2xl bg-white/[0.04] w-24 h-14" />
          </div>
        </div>
      </div>

      {/* Today's Check-In — lead score card */}
      <div className="space-y-4">
        <div className="h-3 bg-white/[0.04] rounded w-12 animate-pulse" />
        <div className="h-5 bg-white/[0.04] rounded w-40 animate-pulse" />
        <div className="glass-card rounded-2xl p-8 animate-pulse">
          <div className="space-y-6">
            <div className="h-4 bg-white/[0.04] rounded w-56" />
            <div className="h-4 bg-white/[0.04] rounded w-40" />
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="h-10 bg-white/[0.04] rounded-xl w-12" />
              ))}
            </div>
            <div className="h-24 bg-white/[0.04] rounded-xl w-full" />
            <div className="h-24 bg-white/[0.04] rounded-xl w-full" />
            <div className="h-10 bg-white/[0.04] rounded-xl w-full" />
          </div>
        </div>
      </div>

      {/* Past Reflections */}
      <div className="space-y-4">
        <div className="h-3 bg-white/[0.04] rounded w-16 animate-pulse" />
        <div className="h-5 bg-white/[0.04] rounded w-36 animate-pulse" />
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="glass-card rounded-2xl p-6 animate-pulse">
              <div className="flex justify-between items-center mb-4">
                <div className="h-3 bg-white/[0.04] rounded w-24" />
                <div className="h-5 bg-white/[0.04] rounded-lg w-16" />
              </div>
              <div className="h-3 bg-white/[0.04] rounded w-20 mb-2" />
              <div className="h-4 bg-white/[0.04] rounded w-full" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
