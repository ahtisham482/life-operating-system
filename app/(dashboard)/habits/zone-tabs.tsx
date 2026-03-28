"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";

const ZONES = {
  today: {
    label: "Today",
    icon: "☀️",
    color: "#FF6B6B",
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
    views: [
      { key: "mastery", label: "Mastery Path" },
      { key: "guide", label: "Learn & Check" },
    ],
    defaultView: "mastery",
  },
} as const;

type ZoneKey = keyof typeof ZONES;

interface ZoneTabsProps {
  activeZone: ZoneKey;
  activeView: string;
}

export function ZoneTabs({ activeZone, activeView }: ZoneTabsProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function navigate(zone: string, view?: string) {
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
    // Remove legacy tab param
    params.delete("tab");
    const query = params.toString();
    router.push(`${pathname}${query ? `?${query}` : ""}`);
  }

  const zone = ZONES[activeZone];
  const views = zone.views;

  return (
    <div className="space-y-3">
      {/* Level 1: Zone tabs — large, clear */}
      <div className="flex gap-2 p-1.5 bg-[#FFF8F0]/[0.02] border border-[#FFF8F0]/[0.05] rounded-2xl w-fit">
        {(Object.entries(ZONES) as [ZoneKey, (typeof ZONES)[ZoneKey]][]).map(
          ([key, z]) => (
            <button
              key={key}
              onClick={() => navigate(key)}
              className={`flex items-center gap-2 px-5 py-2 text-sm font-mono rounded-xl transition-all ${
                activeZone === key
                  ? "border shadow-sm"
                  : "text-[#FFF8F0]/30 hover:text-[#FFF8F0]/60"
              }`}
              style={
                activeZone === key
                  ? {
                      background: `${z.color}15`,
                      borderColor: `${z.color}40`,
                      color: z.color,
                    }
                  : { borderColor: "transparent" }
              }
            >
              <span className="text-base">{z.icon}</span>
              <span>{z.label}</span>
            </button>
          ),
        )}
      </div>

      {/* Level 2: Sub-navigation — secondary row */}
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
