export const dynamic = "force-dynamic";

import { Suspense } from "react";
import { getDateLabelKarachi } from "@/lib/utils";
import { DashboardContent } from "./dashboard-content";

function DashboardGridSkeleton() {
  return (
    <div className="space-y-6 animate-fade-in">
      {/* Pulse Score skeleton */}
      <div className="glass-card rounded-3xl p-8 flex flex-col items-center justify-center animate-pulse">
        <div className="h-20 w-20 rounded-full bg-[#FFF8F0]/[0.04]" />
        <div className="h-3 bg-[#FFF8F0]/[0.04] rounded w-32 mt-4" />
      </div>

      {/* Status pills skeleton */}
      <div className="flex flex-wrap gap-3 justify-center">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="h-8 w-32 rounded-full bg-[#FFF8F0]/[0.04] animate-pulse"
          />
        ))}
      </div>

      {/* Grid skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
        {/* Today's Focus skeleton */}
        <div className="glass-card rounded-3xl p-6 animate-pulse">
          <div className="h-4 bg-[#FFF8F0]/[0.04] rounded w-36 mb-4" />
          <div className="space-y-0">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className={`flex items-center gap-3 py-3 ${
                  i > 1 ? "border-t border-[#FFF8F0]/[0.05]" : ""
                }`}
              >
                <div className="w-5 h-5 rounded bg-[#FFF8F0]/[0.04]" />
                <div className="h-4 bg-[#FFF8F0]/[0.04] rounded flex-1" />
              </div>
            ))}
          </div>
        </div>

        {/* Quick Actions skeleton */}
        <div className="glass-card rounded-3xl p-6 animate-pulse">
          <div className="h-4 bg-[#FFF8F0]/[0.04] rounded w-28 mb-4" />
          <div className="flex flex-col gap-3">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="h-11 bg-[#FFF8F0]/[0.04] rounded-2xl"
              />
            ))}
          </div>
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
    <div className="relative min-h-screen">
      {/* Sunset gradient backdrop */}
      <div
        className="absolute top-0 left-0 right-0 h-[400px] pointer-events-none"
        style={{
          background:
            "linear-gradient(135deg, #FF6B6B 0%, #FEC89A 40%, #FFD93D 100%)",
          opacity: 0.08,
          maskImage: "linear-gradient(to bottom, black 0%, transparent 100%)",
          WebkitMaskImage:
            "linear-gradient(to bottom, black 0%, transparent 100%)",
        }}
      />

      <div className="relative p-4 sm:p-8 max-w-5xl mx-auto space-y-6 sm:space-y-8">
        {/* Header — renders instantly, no data dependency */}
        <div className="space-y-1 text-center pt-4 sm:pt-8">
          <h1 className="text-2xl sm:text-3xl font-serif tracking-wide text-gradient-primary">
            {greeting}
          </h1>
          <p className="text-sm text-[#FFF8F0]/30">{dateLabel}</p>
        </div>

        {/* Data sections — streamed via Suspense */}
        <Suspense fallback={<DashboardGridSkeleton />}>
          <DashboardContent />
        </Suspense>
      </div>
    </div>
  );
}
