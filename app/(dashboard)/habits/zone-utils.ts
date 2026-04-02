// Zone configuration and utilities shared between server and client

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

export type ZoneKey = keyof typeof ZONES;

export { ZONES };

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
