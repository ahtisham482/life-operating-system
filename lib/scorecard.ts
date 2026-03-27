import type {
  IdentityAlignment,
  ScorecardDay,
  ScorecardDayType,
  ScorecardDayStatus,
  ScorecardEntryRow,
  ScorecardRating,
} from "@/lib/db/schema";

export type ScorecardIdentityOption = {
  id: string;
  identityStatement: string;
  color: string;
  icon: string | null;
};

export type ScorecardTimelineItem = {
  id: string;
  rawTime: string;
  time: string;
  rawEndTime: string | null;
  endTime: string | null;
  rawDurationMinutes: number | null;
  duration: string | null;
  behavior: string;
  category: string | null;
  categoryIcon: string;
  rating: ScorecardRating;
  ratingLabel: string;
  ratingTone: "positive" | "negative" | "neutral";
  ratingReason: string | null;
  emotionalState: string | null;
  energyLevel: string | null;
  wasAutomatic: boolean;
  location: string | null;
  chainedFromId: string | null;
  identityLink: {
    identityId: string;
    alignment: IdentityAlignment | null;
  } | null;
};

export type ScorecardLiveStats = {
  totalEntries: number;
  positive: number;
  negative: number;
  neutral: number;
  positivePercentage: number;
  negativePercentage: number;
  currentDayScore: number;
  dayScoreTone: "positive" | "negative" | "neutral";
};

export type ScorecardTimeBreakdown = {
  byCategory: Array<{
    category: string;
    icon: string;
    totalMinutes: number;
    formattedTime: string;
    count: number;
    dominantRating: ScorecardRating;
  }>;
  byTimeOfDay: Array<{
    slot: string;
    slotLabel: string;
    positive: number;
    negative: number;
    neutral: number;
    dominant: "positive" | "negative" | "neutral";
  }>;
  totalTrackedMinutes: number;
};

export type ScorecardOnboardingState = {
  completed: boolean;
  needsOnboarding: boolean;
  starterDate: string;
  starterDateLabel: string;
};

export type ScorecardScreenData = {
  scorecard: ScorecardDay | null;
  timeline: ScorecardTimelineItem[];
  liveStats: ScorecardLiveStats;
  timeBreakdown: ScorecardTimeBreakdown;
  activeIdentities: ScorecardIdentityOption[];
  onboardingState: ScorecardOnboardingState;
  dateLabel: string | null;
};

type ScorecardRollup = Pick<
  ScorecardDay,
  | "totalEntries"
  | "positiveCount"
  | "negativeCount"
  | "neutralCount"
  | "positivePercentage"
  | "negativePercentage"
  | "totalPositiveMinutes"
  | "totalNegativeMinutes"
  | "totalNeutralMinutes"
  | "dayScore"
>;

const CATEGORY_ICONS: Record<string, string> = {
  phone: "📱",
  social_media: "📲",
  food: "🍽️",
  exercise: "🏃",
  work: "💼",
  learning: "📚",
  sleep: "😴",
  hygiene: "🪥",
  social: "👥",
  commute: "🚗",
  entertainment: "🎮",
  household: "🏠",
  meditation: "🧘",
  finance: "💰",
  creative: "🎨",
  health: "🏥",
  routine: "⏰",
  uncategorized: "📋",
};

const TIME_SLOT_LABELS: Record<string, string> = {
  early_morning: "Early Morning",
  morning: "Morning",
  afternoon: "Afternoon",
  evening: "Evening",
  night: "Night",
};

export function calculateDayScore(
  positiveCount: number,
  negativeCount: number,
  neutralCount: number,
  positiveMinutes: number,
  negativeMinutes: number,
): number {
  const total = positiveCount + negativeCount + neutralCount;
  if (total === 0) return 0;

  const countScore = ((positiveCount - negativeCount) / total) * 100;
  const totalMinutes = positiveMinutes + negativeMinutes;
  const timeScore =
    totalMinutes > 0
      ? ((positiveMinutes - negativeMinutes) / totalMinutes) * 100
      : 0;

  return clamp(Math.round(countScore * 0.6 + timeScore * 0.4), -100, 100);
}

export function calculateDurationMinutes(
  startTime: string,
  endTime: string,
): number {
  const start = timeToMinutes(startTime);
  const end = timeToMinutes(endTime);
  const rawMinutes = end >= start ? end - start : 24 * 60 - start + end;

  return rawMinutes > 0 ? rawMinutes : 0;
}

export function formatMinutes(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const remaining = minutes % 60;
  return remaining > 0 ? `${hours}h ${remaining}m` : `${hours}h`;
}

export function formatTimeLabel(timeValue: string | null | undefined): string {
  if (!timeValue) return "";

  const [hourString, minuteString] = timeValue.split(":");
  const hour = Number.parseInt(hourString, 10);
  const minute = Number.parseInt(minuteString, 10);
  const suffix = hour >= 12 ? "PM" : "AM";
  const normalizedHour = hour % 12 || 12;

  return `${normalizedHour}:${String(minute).padStart(2, "0")} ${suffix}`;
}

export function getScorecardDateLabel(dateValue: string): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Karachi",
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(new Date(`${dateValue}T12:00:00`));
}

export function getStarterDate(today: string): string {
  const yesterday = new Date(`${today}T12:00:00`);
  yesterday.setDate(yesterday.getDate() - 1);
  return yesterday.toISOString().slice(0, 10);
}

export function getDefaultDayType(dateValue: string): ScorecardDayType {
  const dayOfWeek = new Date(`${dateValue}T12:00:00`).getDay();
  return dayOfWeek === 0 || dayOfWeek === 6 ? "weekend" : "normal";
}

export function buildLiveStats(
  scorecard: ScorecardDay | null,
): ScorecardLiveStats {
  if (!scorecard) {
    return {
      totalEntries: 0,
      positive: 0,
      negative: 0,
      neutral: 0,
      positivePercentage: 0,
      negativePercentage: 0,
      currentDayScore: 0,
      dayScoreTone: "neutral",
    };
  }

  const dayScore = scorecard.dayScore ?? 0;

  return {
    totalEntries: scorecard.totalEntries,
    positive: scorecard.positiveCount,
    negative: scorecard.negativeCount,
    neutral: scorecard.neutralCount,
    positivePercentage: coerceNumeric(scorecard.positivePercentage),
    negativePercentage: coerceNumeric(scorecard.negativePercentage),
    currentDayScore: dayScore,
    dayScoreTone:
      dayScore > 0 ? "positive" : dayScore < 0 ? "negative" : "neutral",
  };
}

export function buildTimeline(
  entries: ScorecardEntryRow[],
): ScorecardTimelineItem[] {
  const sortedEntries = [...entries].sort((left, right) => {
    const timeCompare = left.timeOfAction.localeCompare(right.timeOfAction);
    if (timeCompare !== 0) return timeCompare;
    return left.sortOrder - right.sortOrder;
  });

  return sortedEntries.map((entry) => ({
    id: entry.id,
    rawTime: entry.timeOfAction,
    time: formatTimeLabel(entry.timeOfAction),
    rawEndTime: entry.endTime ?? null,
    endTime: entry.endTime ? formatTimeLabel(entry.endTime) : null,
    rawDurationMinutes: entry.durationMinutes ?? null,
    duration:
      entry.durationMinutes && entry.durationMinutes > 0
        ? formatMinutes(entry.durationMinutes)
        : null,
    behavior: entry.behaviorDescription,
    category: entry.behaviorCategory,
    categoryIcon: getCategoryIcon(entry.behaviorCategory),
    rating: entry.rating,
    ratingLabel: getRatingLabel(entry.rating),
    ratingTone: getRatingTone(entry.rating),
    ratingReason: entry.ratingReason ?? null,
    emotionalState: entry.emotionalState ?? null,
    energyLevel: entry.energyLevel ?? null,
    wasAutomatic: entry.wasAutomatic,
    location: entry.location ?? null,
    chainedFromId: entry.triggeredByEntryId ?? null,
    identityLink: entry.linkedIdentityId
      ? {
          identityId: entry.linkedIdentityId,
          alignment: entry.identityAlignment ?? null,
        }
      : null,
  }));
}

export function buildTimeBreakdown(
  entries: ScorecardEntryRow[],
): ScorecardTimeBreakdown {
  const categoryMap = new Map<
    string,
    {
      count: number;
      minutes: number;
      positive: number;
      negative: number;
      neutral: number;
    }
  >();

  const timeOfDayMap = new Map<
    string,
    { positive: number; negative: number; neutral: number }
  >(
    Object.keys(TIME_SLOT_LABELS).map((slot) => [
      slot,
      { positive: 0, negative: 0, neutral: 0 },
    ]),
  );

  let totalTrackedMinutes = 0;

  for (const entry of entries) {
    const category = entry.behaviorCategory || "uncategorized";
    const categoryValue = categoryMap.get(category) ?? {
      count: 0,
      minutes: 0,
      positive: 0,
      negative: 0,
      neutral: 0,
    };
    categoryValue.count += 1;
    categoryValue.minutes += entry.durationMinutes ?? 0;
    categoryValue[getRatingCounter(entry.rating)] += 1;
    categoryMap.set(category, categoryValue);

    const slot = getTimeSlot(entry.timeOfAction);
    const slotValue = timeOfDayMap.get(slot) ?? {
      positive: 0,
      negative: 0,
      neutral: 0,
    };
    slotValue[getRatingCounter(entry.rating)] += 1;
    timeOfDayMap.set(slot, slotValue);

    totalTrackedMinutes += entry.durationMinutes ?? 0;
  }

  return {
    byCategory: [...categoryMap.entries()]
      .map(([category, value]) => ({
        category,
        icon: getCategoryIcon(category),
        totalMinutes: value.minutes,
        formattedTime: formatMinutes(value.minutes),
        count: value.count,
        dominantRating: getDominantRating(value),
      }))
      .sort((left, right) => right.totalMinutes - left.totalMinutes),
    byTimeOfDay: [...timeOfDayMap.entries()].map(([slot, value]) => ({
      slot,
      slotLabel: TIME_SLOT_LABELS[slot],
      positive: value.positive,
      negative: value.negative,
      neutral: value.neutral,
      dominant: getDominantTone(value),
    })),
    totalTrackedMinutes,
  };
}

export function computeScorecardRollup(
  entries: ScorecardEntryRow[],
): ScorecardRollup {
  const positiveEntries = entries.filter((entry) => entry.rating === "+");
  const negativeEntries = entries.filter((entry) => entry.rating === "-");
  const neutralEntries = entries.filter((entry) => entry.rating === "=");

  const totalEntries = entries.length;
  const positiveCount = positiveEntries.length;
  const negativeCount = negativeEntries.length;
  const neutralCount = neutralEntries.length;
  const totalPositiveMinutes = positiveEntries.reduce(
    (sum, entry) => sum + (entry.durationMinutes ?? 0),
    0,
  );
  const totalNegativeMinutes = negativeEntries.reduce(
    (sum, entry) => sum + (entry.durationMinutes ?? 0),
    0,
  );
  const totalNeutralMinutes = neutralEntries.reduce(
    (sum, entry) => sum + (entry.durationMinutes ?? 0),
    0,
  );

  const positivePercentage =
    totalEntries > 0 ? roundToTwo((positiveCount / totalEntries) * 100) : 0;
  const negativePercentage =
    totalEntries > 0 ? roundToTwo((negativeCount / totalEntries) * 100) : 0;

  return {
    totalEntries,
    positiveCount,
    negativeCount,
    neutralCount,
    positivePercentage: positivePercentage.toFixed(2),
    negativePercentage: negativePercentage.toFixed(2),
    totalPositiveMinutes,
    totalNegativeMinutes,
    totalNeutralMinutes,
    dayScore: calculateDayScore(
      positiveCount,
      negativeCount,
      neutralCount,
      totalPositiveMinutes,
      totalNegativeMinutes,
    ),
  };
}

export function getCategoryIcon(category: string | null | undefined): string {
  return CATEGORY_ICONS[category || "uncategorized"] ?? CATEGORY_ICONS.uncategorized;
}

export function getRatingLabel(rating: ScorecardRating): string {
  if (rating === "+") return "Builds the person you want to become";
  if (rating === "-") return "Works against the person you want to become";
  return "Neutral vote";
}

export function getRatingTone(
  rating: ScorecardRating,
): "positive" | "negative" | "neutral" {
  if (rating === "+") return "positive";
  if (rating === "-") return "negative";
  return "neutral";
}

export function getStatusLabel(status: ScorecardDayStatus): string {
  return status === "completed" ? "Completed" : "In progress";
}

function getTimeSlot(timeValue: string): string {
  const hour = Number.parseInt(timeValue.split(":")[0], 10);

  if (hour >= 5 && hour < 8) return "early_morning";
  if (hour >= 8 && hour < 12) return "morning";
  if (hour >= 12 && hour < 17) return "afternoon";
  if (hour >= 17 && hour < 21) return "evening";
  return "night";
}

function getRatingCounter(rating: ScorecardRating): "positive" | "negative" | "neutral" {
  if (rating === "+") return "positive";
  if (rating === "-") return "negative";
  return "neutral";
}

function getDominantRating(value: {
  positive: number;
  negative: number;
  neutral: number;
}): ScorecardRating {
  if (value.positive >= value.negative && value.positive >= value.neutral) {
    return "+";
  }
  if (value.negative >= value.positive && value.negative >= value.neutral) {
    return "-";
  }
  return "=";
}

function getDominantTone(value: {
  positive: number;
  negative: number;
  neutral: number;
}): "positive" | "negative" | "neutral" {
  const dominantRating = getDominantRating(value);
  return dominantRating === "+" ? "positive" : dominantRating === "-" ? "negative" : "neutral";
}

function timeToMinutes(timeValue: string): number {
  const [hourString, minuteString] = timeValue.split(":");
  return Number.parseInt(hourString, 10) * 60 + Number.parseInt(minuteString, 10);
}

function coerceNumeric(value: string | number | null | undefined): number {
  if (typeof value === "number") return value;
  if (typeof value === "string") return Number.parseFloat(value);
  return 0;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function roundToTwo(value: number): number {
  return Math.round(value * 100) / 100;
}
