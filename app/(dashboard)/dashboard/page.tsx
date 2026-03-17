export const dynamic = "force-dynamic";

import { Suspense } from "react";
import { getDateLabelKarachi } from "@/lib/utils";
import { DashboardContent } from "./dashboard-content";

function DashboardGridSkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 animate-fade-in">
      {/* Pulse Score skeleton */}
      <div className="glass-card rounded-2xl p-6 flex flex-col items-center justify-center animate-pulse">
        <div className="h-3 bg-white/[0.04] rounded w-24 mb-4" />
        <div className="w-20 h-20 rounded-full bg-white/[0.04]" />
        <div className="h-3 bg-white/[0.04] rounded w-20 mt-3" />
      </div>

      {/* Today's Focus skeleton */}
      <div className="glass-card rounded-2xl p-6 animate-pulse">
        <div className="flex items-center justify-between mb-4">
          <div className="h-3 bg-white/[0.04] rounded w-24" />
          <div className="h-3 bg-white/[0.04] rounded w-12" />
        </div>
        <div className="space-y-0">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className={`flex items-center gap-3 py-3 ${
                i > 1 ? "border-t border-white/[0.05]" : ""
              }`}
            >
              <div className="w-5 h-5 rounded bg-white/[0.04]" />
              <div className="h-4 bg-white/[0.04] rounded flex-1" />
              <div className="h-3 bg-white/[0.04] rounded w-16" />
            </div>
          ))}
        </div>
      </div>

      {/* Quick Stats skeleton */}
      <div className="glass-card rounded-2xl p-6 animate-pulse">
        <div className="h-3 bg-white/[0.04] rounded w-20 mb-4" />
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i}>
              <div className="flex items-center justify-between">
                <div className="h-4 bg-white/[0.04] rounded w-16" />
                <div className="h-4 bg-white/[0.04] rounded w-20" />
              </div>
              {i < 4 && (
                <div className="border-t border-white/[0.05] mt-3" />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Quick Actions skeleton */}
      <div className="glass-card rounded-2xl p-6 animate-pulse">
        <div className="h-3 bg-white/[0.04] rounded w-24 mb-4" />
        <div className="flex flex-col gap-3">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="h-11 bg-white/[0.04] rounded-xl border border-white/[0.05]"
            />
          ))}
        </div>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const dateLabel = getDateLabelKarachi();

  // Time-of-day greeting (Asia/Karachi) — no DB needed, renders instantly
  const hourStr = new Date().toLocaleString("en-US", {
    timeZone: "Asia/Karachi",
    hour: "numeric",
    hour12: false,
  });
  const hour = parseInt(hourStr, 10);
  let greeting: string;
  if (hour < 12) {
    greeting = "Good morning, Muhammad";
  } else if (hour < 18) {
    greeting = "Good afternoon, Muhammad";
  } else {
    greeting = "Good evening, Muhammad";
  }

  return (
    <div className="p-4 sm:p-8 max-w-5xl mx-auto space-y-6 sm:space-y-8">
      {/* Header — renders instantly, no data dependency */}
      <div className="space-y-1">
        <h1 className="text-xl sm:text-2xl font-serif tracking-wide text-gradient-primary">
          {greeting}
        </h1>
        <p className="font-mono text-[11px] tracking-widest text-white/30">
          {dateLabel}
        </p>
      </div>

      {/* Data sections — streamed via Suspense */}
      <Suspense fallback={<DashboardGridSkeleton />}>
        <DashboardContent />
      </Suspense>
    </div>
  );
}
