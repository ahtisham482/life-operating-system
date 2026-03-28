"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";

const ZONES = {
  today: {
    label: "Today",
    icon: "☀️",
    color: "#FF6B6B",
    description: "Your daily habits and tracking",
    views: [
      { key: "tracker", label: "Daily Tracker" },
      { key: "scorecard", label: "Scorecard" },
      { key: "identity", label: "Identity" },
    ],
    defaultView: "tracker",
  },
  build: {
    label: "Build & Break",
    icon: "🏗️",
    color: "#2DD4BF",
    description: "Design your habit systems",
    views: [
      { key: "architect", label: "Design Habits" },
      { key: "attract", label: "Make It Rewarding" },
      { key: "friction", label: "Make It Easy" },
      { key: "rewards", label: "Rewards & Contracts" },
      { key: "breaker", label: "Break Bad Habits" },
    ],
    defaultView: "architect",
  },
  grow: {
    label: "Grow",
    icon: "🌱",
    color: "#A78BFA",
    description: "Level up and master your habits",
    views: [
      { key: "mastery", label: "Mastery Path" },
      { key: "guide", label: "Learn & Check" },
    ],
    defaultView: "mastery",
  },
} as const;

type ZoneKey = keyof typeof ZONES;

// Progressive disclosure: what's unlocked based on user maturity
export function getUnlockedZones(daysOfData: number, habitsCount: number): {
  today: boolean;
  build: boolean;
  grow: boolean;
  buildMessage: string | null;
  growMessage: string | null;
} {
  const today = true; // Always available
  const build = habitsCount >= 1 && daysOfData >= 3;
  const grow = daysOfData >= 14;

  return {
    today,
    build,
    grow,
    buildMessage: !build
      ? habitsCount === 0
        ? "Create your first habit to unlock"
        : "Track for 3+ days to unlock"
      : null,
    growMessage: !grow
      ? `Track for ${Math.max(0, 14 - daysOfData)} more days to unlock`
      : null,
  };
}

interface ZoneTabsProps {
  activeZone: ZoneKey;
  activeView: string;
  daysOfData: number;
  habitsCount: number;
}

export function ZoneTabs({ activeZone, activeView, daysOfData, habitsCount }: ZoneTabsProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const unlocked = getUnlockedZones(daysOfData, habitsCount);

  function navigate(zone: string, view?: string) {
    // Don't navigate to locked zones
    if (zone === "build" && !unlocked.build) return;
    if (zone === "grow" && !unlocked.grow) return;

    const params = new URLSearchParams(searchParams.toString());
    if (zone === "today" && (!view || view === "tracker")) {
      params.delete("zone");
      params.delete("view");
    } else {
      params.set("zone", zone);
      if (view) {
        params.set("view", view);
      } else {
        params.delete("view");
      }
    }
    params.delete("tab");
    const query = params.toString();
    router.push(`${pathname}${query ? `?${query}` : ""}`);
  }

  const zone = ZONES[activeZone];
  const views = zone.views;

  return (
    <div className="space-y-3">
      {/* Level 1: Zone tabs */}
      <div className="flex gap-2 p-1.5 bg-[#FFF8F0]/[0.02] border border-[#FFF8F0]/[0.05] rounded-2xl w-fit flex-wrap">
        {(Object.entries(ZONES) as [ZoneKey, (typeof ZONES)[ZoneKey]][]).map(
          ([key, z]) => {
            const isLocked = (key === "build" && !unlocked.build) || (key === "grow" && !unlocked.grow);
            const lockMsg = key === "build" ? unlocked.buildMessage : key === "grow" ? unlocked.growMessage : null;

            return (
              <div key={key} className="relative group">
                <button
                  onClick={() => navigate(key)}
                  className={`flex items-center gap-2 px-4 sm:px-5 py-2 text-xs sm:text-sm font-mono rounded-xl transition-all ${
                    isLocked
                      ? "text-[#FFF8F0]/15 cursor-not-allowed"
                      : activeZone === key
                        ? "border shadow-sm"
                        : "text-[#FFF8F0]/30 hover:text-[#FFF8F0]/60"
                  }`}
                  style={
                    !isLocked && activeZone === key
                      ? {
                          background: `${z.color}15`,
                          borderColor: `${z.color}40`,
                          color: z.color,
                        }
                      : { borderColor: "transparent" }
                  }
                  disabled={isLocked}
                >
                  <span className="text-base">{isLocked ? "🔒" : z.icon}</span>
                  <span>{z.label}</span>
                </button>

                {/* Lock tooltip */}
                {isLocked && lockMsg && (
                  <div className="absolute left-1/2 -translate-x-1/2 top-full mt-2 px-3 py-1.5 bg-[#1a1a1a] border border-[#FFF8F0]/[0.1] rounded-lg text-[10px] font-mono text-[#FFF8F0]/50 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                    {lockMsg}
                  </div>
                )}
              </div>
            );
          },
        )}
      </div>

      {/* Level 2: Sub-navigation */}
      <div className="flex items-center gap-1 overflow-x-auto pb-0.5 scrollbar-hide">
        {views.map((v, i) => (
          <div key={v.key} className="flex items-center shrink-0">
            {i > 0 && (
              <span className="mx-1.5 text-[#FFF8F0]/10 text-[10px]">·</span>
            )}
            <button
              onClick={() => navigate(activeZone, v.key)}
              className={`px-3 py-1 text-[11px] font-mono rounded-lg transition-all whitespace-nowrap ${
                activeView === v.key
                  ? "text-[#FFF8F0]/90 bg-[#FFF8F0]/[0.08]"
                  : "text-[#FFF8F0]/30 hover:text-[#FFF8F0]/50"
              }`}
            >
              {v.label}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

// Resolve zone from URL params (with backward compatibility for ?tab=)
export function resolveNavigation(params: {
  zone?: string;
  view?: string;
  tab?: string;
}): { zone: ZoneKey; view: string } {
  // Backward compatibility: old ?tab= param
  if (params.tab && !params.zone) {
    const tabToZone: Record<string, { zone: ZoneKey; view: string }> = {
      tracker: { zone: "today", view: "tracker" },
      scorecard: { zone: "today", view: "scorecard" },
      identity: { zone: "today", view: "identity" },
      architect: { zone: "build", view: "architect" },
      attract: { zone: "build", view: "attract" },
      friction: { zone: "build", view: "friction" },
      rewards: { zone: "build", view: "rewards" },
      breaker: { zone: "build", view: "breaker" },
      mastery: { zone: "grow", view: "mastery" },
      guide: { zone: "grow", view: "guide" },
    };
    return tabToZone[params.tab] ?? { zone: "today", view: "tracker" };
  }

  // New zone/view params
  const zoneKey = (
    params.zone && params.zone in ZONES ? params.zone : "today"
  ) as ZoneKey;
  const zoneConfig = ZONES[zoneKey];
  const validViews = zoneConfig.views.map((v) => v.key) as string[];
  const view =
    params.view && validViews.includes(params.view)
      ? params.view
      : (zoneConfig.defaultView as string);

  return { zone: zoneKey, view };
}
