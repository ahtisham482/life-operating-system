// ─────────────────────────────────────────
// Scorecard helper functions
// ─────────────────────────────────────────

export type ScorecardRating = "+" | "-" | "=";
export type DayType = "normal" | "weekend" | "holiday" | "travel" | "sick";
export type ScorecardStatus = "in_progress" | "completed";
export type EnergyLevel = "high" | "medium" | "low";

export interface ScorecardDay {
  id: string;
  userId: string;
  scorecardDate: string;
  dayType: DayType;
  dayLabel: string | null;
  morningIntention: string | null;
  eveningReflection: string | null;
  awarenessRating: number | null;
  totalEntries: number;
  positiveCount: number;
  negativeCount: number;
  neutralCount: number;
  totalPositiveMinutes: number;
  totalNegativeMinutes: number;
  totalNeutralMinutes: number;
  dayScore: number;
  status: ScorecardStatus;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ScorecardEntry {
  id: string;
  scorecardId: string;
  userId: string;
  timeOfAction: string;
  endTime: string | null;
  durationMinutes: number | null;
  behaviorDescription: string;
  behaviorCategory: string | null;
  rating: ScorecardRating;
  ratingReason: string | null;
  linkedIdentityId: string | null;
  identityAlignment: string | null;
  location: string | null;
  energyLevel: EnergyLevel | null;
  emotionalState: string | null;
  wasAutomatic: boolean;
  triggeredByEntryId: string | null;
  triggerType: string | null;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface BehaviorLibraryItem {
  id: string;
  userId: string;
  behaviorName: string;
  normalizedName: string;
  behaviorCategory: string | null;
  defaultRating: string | null;
  timesLogged: number;
  avgDurationMinutes: number;
  totalMinutesSpent: number;
  positiveCount: number;
  negativeCount: number;
  neutralCount: number;
  mostCommonTime: string | null;
  isFavorite: boolean;
  lastLoggedAt: string;
}

/** Calculate day score: -100 to +100 */
export function calculateDayScore(
  positiveCount: number,
  negativeCount: number,
  neutralCount: number,
  positiveMinutes: number,
  negativeMinutes: number,
): number {
  const total = positiveCount + negativeCount + neutralCount;
  if (total === 0) return 0;

  // Count-based: 60% weight
  const countScore = ((positiveCount - negativeCount) / total) * 100;

  // Time-based: 40% weight
  const totalMinutes = positiveMinutes + negativeMinutes;
  const timeScore =
    totalMinutes > 0
      ? ((positiveMinutes - negativeMinutes) / totalMinutes) * 100
      : 0;

  const raw = countScore * 0.6 + timeScore * 0.4;
  return Math.max(-100, Math.min(100, Math.round(raw)));
}

/** Auto-detect behavior category from description */
export function detectCategory(behavior: string): string {
  const lower = behavior.toLowerCase();

  const rules: [string, string[]][] = [
    [
      "phone",
      [
        "phone",
        "scroll",
        "instagram",
        "twitter",
        "tiktok",
        "reddit",
        "youtube",
        "social media",
        "notification",
        "whatsapp",
        "facebook",
        "snapchat",
      ],
    ],
    [
      "food",
      [
        "eat",
        "breakfast",
        "lunch",
        "dinner",
        "snack",
        "cook",
        "meal",
        "coffee",
        "tea",
        "water",
      ],
    ],
    [
      "exercise",
      [
        "workout",
        "exercise",
        "run",
        "walk",
        "gym",
        "yoga",
        "stretch",
        "pushup",
        "swim",
        "bike",
      ],
    ],
    [
      "work",
      [
        "work",
        "meeting",
        "email",
        "office",
        "project",
        "deadline",
        "client",
        "task",
        "presentation",
      ],
    ],
    [
      "learning",
      [
        "read",
        "study",
        "course",
        "learn",
        "book",
        "podcast",
        "tutorial",
        "practice",
      ],
    ],
    ["sleep", ["sleep", "nap", "bed", "wake", "alarm", "rest"]],
    [
      "hygiene",
      [
        "brush",
        "shower",
        "bath",
        "teeth",
        "wash",
        "groom",
        "skincare",
        "clean",
      ],
    ],
    [
      "social",
      [
        "friend",
        "family",
        "call",
        "visit",
        "hang out",
        "party",
        "conversation",
      ],
    ],
    [
      "entertainment",
      ["netflix", "movie", "tv", "game", "gaming", "watch", "show", "stream"],
    ],
    [
      "meditation",
      [
        "meditate",
        "mindful",
        "breathe",
        "journal",
        "gratitude",
        "reflect",
        "pray",
        "quran",
        "tafseer",
      ],
    ],
  ];

  for (const [category, keywords] of rules) {
    if (keywords.some((kw) => lower.includes(kw))) {
      return category;
    }
  }

  return "other";
}

/** Normalize a behavior name for library dedup */
export function normalizeBehavior(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "_")
    .replace(/[^\w]/g, "");
}

/** Rating display helpers */
export function getRatingColor(rating: ScorecardRating): string {
  switch (rating) {
    case "+":
      return "#34D399";
    case "-":
      return "#F87171";
    case "=":
      return "#9CA3AF";
  }
}

export function getRatingEmoji(rating: ScorecardRating): string {
  switch (rating) {
    case "+":
      return "✅";
    case "-":
      return "❌";
    case "=":
      return "➖";
  }
}

export function getRatingLabel(rating: ScorecardRating): string {
  switch (rating) {
    case "+":
      return "Positive — builds your identity";
    case "-":
      return "Negative — works against your identity";
    case "=":
      return "Neutral — no significant impact";
  }
}

export function getCategoryIcon(category: string | null): string {
  const icons: Record<string, string> = {
    phone: "📱",
    food: "🍽️",
    exercise: "🏃",
    work: "💼",
    learning: "📚",
    sleep: "😴",
    hygiene: "🪥",
    social: "👥",
    entertainment: "🎮",
    meditation: "🧘",
    other: "📋",
  };
  return icons[category ?? "other"] ?? "📋";
}

/** Format time string for display */
export function formatTimeDisplay(time: string): string {
  const [h, m] = time.split(":");
  const hour = parseInt(h, 10);
  const ampm = hour >= 12 ? "PM" : "AM";
  const h12 = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
  return `${h12}:${m} ${ampm}`;
}

/** Format minutes to readable string */
export function formatMinutes(minutes: number): string {
  if (minutes < 60) return `${minutes}m`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

/** Generate day insights after scorecard completion */
export function generateDayInsights(
  entries: ScorecardEntry[],
  dayScore: number,
): {
  type: string;
  icon: string;
  title: string;
  description: string;
  severity: "positive" | "medium" | "high";
}[] {
  const insights: {
    type: string;
    icon: string;
    title: string;
    description: string;
    severity: "positive" | "medium" | "high";
  }[] = [];

  // Autopilot negative behaviors
  const autoNeg = entries.filter((e) => e.wasAutomatic && e.rating === "-");
  if (autoNeg.length > 0) {
    insights.push({
      type: "awareness",
      icon: "🤖",
      title: `${autoNeg.length} negative behavior${autoNeg.length > 1 ? "s" : ""} on AUTOPILOT`,
      description: `You did these without thinking: ${autoNeg
        .slice(0, 3)
        .map((e) => e.behaviorDescription)
        .join(", ")}. The scorecard reveals unconscious patterns.`,
      severity: autoNeg.length > 3 ? "high" : "medium",
    });
  }

  // Negative time
  const negMinutes = entries
    .filter((e) => e.rating === "-")
    .reduce((s, e) => s + (e.durationMinutes ?? 0), 0);
  if (negMinutes > 60) {
    const hours = Math.round((negMinutes / 60) * 10) / 10;
    insights.push({
      type: "time",
      icon: "⏰",
      title: `${hours} hours on negative behaviors`,
      description: `That's ${Math.round((negMinutes / (16 * 60)) * 100)}% of your waking hours going against who you want to become.`,
      severity: negMinutes > 120 ? "high" : "medium",
    });
  }

  // Best time of day
  const positive = entries.filter((e) => e.rating === "+");
  if (positive.length > 0 && entries.length >= 5) {
    const morningPos = positive.filter(
      (e) => parseInt(e.timeOfAction.split(":")[0]) < 12,
    ).length;
    const afternoonPos = positive.filter((e) => {
      const h = parseInt(e.timeOfAction.split(":")[0]);
      return h >= 12 && h < 17;
    }).length;
    const eveningPos = positive.filter(
      (e) => parseInt(e.timeOfAction.split(":")[0]) >= 17,
    ).length;

    const best =
      morningPos >= afternoonPos && morningPos >= eveningPos
        ? "Morning"
        : afternoonPos >= eveningPos
          ? "Afternoon"
          : "Evening";

    insights.push({
      type: "pattern",
      icon: "🌟",
      title: `Your best time: ${best}`,
      description:
        "Schedule your most important identity-building habits during this time.",
      severity: "positive",
    });
  }

  // First behavior impact
  if (entries.length > 0) {
    const first = entries[0];
    if (first.rating === "-") {
      insights.push({
        type: "warning",
        icon: "⚠️",
        title: `Day started with a negative: "${first.behaviorDescription}"`,
        description:
          "Your first behavior sets the tone. Design a morning routine that starts positive.",
        severity: "high",
      });
    } else if (first.rating === "+") {
      insights.push({
        type: "pattern",
        icon: "🌅",
        title: "Strong start — first behavior was positive!",
        description:
          "Starting with a positive behavior creates momentum for the whole day.",
        severity: "positive",
      });
    }
  }

  return insights;
}

/** Onboarding template for first scorecard */
export const FIRST_SCORECARD_TEMPLATE = [
  {
    time: "06:00-07:00",
    label: "🌅 Wake Up Hour",
    suggestions: [
      { name: "Wake up", defaultRating: "=" as ScorecardRating },
      { name: "Check phone immediately", defaultRating: "-" as ScorecardRating },
      { name: "Brush teeth", defaultRating: "+" as ScorecardRating },
      { name: "Drink water", defaultRating: "+" as ScorecardRating },
      { name: "Scroll social media in bed", defaultRating: "-" as ScorecardRating },
      { name: "Make bed", defaultRating: "+" as ScorecardRating },
    ],
  },
  {
    time: "07:00-09:00",
    label: "🌞 Morning Routine",
    suggestions: [
      { name: "Eat breakfast", defaultRating: "+" as ScorecardRating },
      { name: "Skip breakfast", defaultRating: "-" as ScorecardRating },
      { name: "Shower", defaultRating: "=" as ScorecardRating },
      { name: "Exercise / Workout", defaultRating: "+" as ScorecardRating },
      { name: "Listen to podcast", defaultRating: "+" as ScorecardRating },
    ],
  },
  {
    time: "09:00-12:00",
    label: "💼 Morning Work",
    suggestions: [
      { name: "Deep focused work", defaultRating: "+" as ScorecardRating },
      { name: "Check emails", defaultRating: "=" as ScorecardRating },
      { name: "Procrastinate", defaultRating: "-" as ScorecardRating },
      { name: "Browse internet aimlessly", defaultRating: "-" as ScorecardRating },
    ],
  },
  {
    time: "12:00-14:00",
    label: "🍽️ Midday",
    suggestions: [
      { name: "Eat a healthy lunch", defaultRating: "+" as ScorecardRating },
      { name: "Eat junk food", defaultRating: "-" as ScorecardRating },
      { name: "Take a walk", defaultRating: "+" as ScorecardRating },
      { name: "Scroll phone during lunch", defaultRating: "-" as ScorecardRating },
    ],
  },
  {
    time: "14:00-17:00",
    label: "💼 Afternoon Work",
    suggestions: [
      { name: "Focused work session", defaultRating: "+" as ScorecardRating },
      { name: "Snacking mindlessly", defaultRating: "-" as ScorecardRating },
      { name: "Social media break", defaultRating: "-" as ScorecardRating },
    ],
  },
  {
    time: "17:00-21:00",
    label: "🌙 Evening",
    suggestions: [
      { name: "Exercise / Gym", defaultRating: "+" as ScorecardRating },
      { name: "Cook dinner", defaultRating: "+" as ScorecardRating },
      { name: "Read a book", defaultRating: "+" as ScorecardRating },
      { name: "Watch TV/Netflix", defaultRating: "-" as ScorecardRating },
      { name: "Scroll social media", defaultRating: "-" as ScorecardRating },
      { name: "Spend time with family", defaultRating: "+" as ScorecardRating },
    ],
  },
  {
    time: "21:00-23:00",
    label: "😴 Bedtime",
    suggestions: [
      { name: "Scroll phone in bed", defaultRating: "-" as ScorecardRating },
      { name: "Read in bed", defaultRating: "+" as ScorecardRating },
      { name: "Plan tomorrow", defaultRating: "+" as ScorecardRating },
      { name: "Go to sleep on time", defaultRating: "+" as ScorecardRating },
      { name: "Stay up too late", defaultRating: "-" as ScorecardRating },
    ],
  },
];
