// ─────────────────────────────────────────
// Habit Breaker Engine — Types, Helpers, Suggestions
// ─────────────────────────────────────────

export interface BadHabit {
  id: string; userId: string; habitName: string; antiIdentity: string | null;
  frequencyEstimate: string | null; underlyingNeeds: string[];
  replacementDescription: string | null;
  triggersTime: string[]; triggersLocation: string[]; triggersEmotion: string[]; triggersAction: string[];
  dailyHoursEstimate: number | null; hourlyValue: number | null;
  defenseLayer1: DefenseAction[]; defenseLayer2: DefenseAction[];
  defenseLayer3: DefenseAction[]; defenseLayer4: DefenseAction[];
  defenseStrength: number;
  currentCleanStreak: number; bestCleanStreak: number;
  totalUrgesResisted: number; totalSlips: number; resistanceRate: number;
  isActive: boolean; createdAt: string;
}

export interface DefenseAction { action: string; completed: boolean; }

export interface UrgeLog {
  id: string; badHabitId: string; logDate: string; logTime: string;
  result: "resisted" | "slipped" | "surfed";
  triggerType: string | null; triggerLocation: string | null;
  urgeIntensity: number | null; usedReplacement: boolean;
  slipDurationMinutes: number | null; failedDefenseLayer: number | null;
  postFeeling: string | null; note: string | null;
}

export interface ReframeItem {
  id: string; badHabitId: string; brainSays: string; truthIs: string;
  isCustom: boolean; timesShown: number; timesHelped: number;
}

// ─── DEFENSE STRENGTH ───

export function calculateDefenseStrength(layers: DefenseAction[][]): number {
  let total = 0;
  let completed = 0;
  for (const layer of layers) {
    total += layer.length;
    completed += layer.filter((a) => a.completed).length;
  }
  return total > 0 ? Math.round((completed / total) * 100) : 0;
}

export function getLayerStrength(layer: DefenseAction[]): { strength: number; label: string; color: string } {
  if (layer.length === 0) return { strength: 0, label: "Empty", color: "#9CA3AF" };
  const done = layer.filter((a) => a.completed).length;
  const pct = Math.round((done / layer.length) * 100);
  if (pct >= 75) return { strength: pct, label: "Strong", color: "#34D399" };
  if (pct >= 40) return { strength: pct, label: "Medium", color: "#FEC89A" };
  return { strength: pct, label: "Weak", color: "#F87171" };
}

export const LAYER_NAMES = ["Invisible 👁️", "Unattractive 🤢", "Difficult 🧱", "Unsatisfying 💔"];
export const LAYER_ICONS = ["👁️", "🤢", "🧱", "💔"];

// ─── COST CALCULATOR ───

export function calculateCost(dailyHours: number, hourlyValue: number) {
  const daily = dailyHours;
  const weekly = daily * 7;
  const monthly = daily * 30;
  const yearly = daily * 365;
  const yearlyDays = Math.round((yearly / 24) * 10) / 10;
  const yearlyMoney = Math.round(yearly * hourlyValue);
  const booksEquiv = Math.round(yearly / 7); // ~7 hrs per book
  return { daily, weekly, monthly, yearly, yearlyDays, yearlyMoney, booksEquiv };
}

// ─── UNDERLYING NEEDS ───

export const NEED_OPTIONS = [
  { value: "stimulation", label: "Stimulation / Entertainment", icon: "🎭" },
  { value: "escape", label: "Escape / Avoidance", icon: "🏃" },
  { value: "comfort", label: "Comfort / Soothing", icon: "🧸" },
  { value: "connection", label: "Connection / Social", icon: "👥" },
  { value: "stress_relief", label: "Stress Relief", icon: "😮‍💨" },
  { value: "reward", label: "Reward / Pleasure", icon: "🎁" },
  { value: "autopilot", label: "Habit / Autopilot", icon: "🤖" },
];

// ─── REPLACEMENT SUGGESTIONS ───

export function getReplacementSuggestions(needs: string[]): { suggestion: string; icon: string; need: string }[] {
  const db: Record<string, { suggestion: string; icon: string }[]> = {
    stimulation: [
      { suggestion: "Read 2 pages of a book", icon: "📖" },
      { suggestion: "Do a quick puzzle", icon: "🧩" },
      { suggestion: "Write 3 sentences in journal", icon: "✍️" },
      { suggestion: "Listen to one song mindfully", icon: "🎵" },
    ],
    escape: [
      { suggestion: "Take a 2-minute walk", icon: "🚶" },
      { suggestion: "3 deep breaths with eyes closed", icon: "🧘" },
      { suggestion: "Make a cup of tea", icon: "☕" },
      { suggestion: "Look out a window for 60 seconds", icon: "🪟" },
    ],
    comfort: [
      { suggestion: "Drink warm water or tea", icon: "☕" },
      { suggestion: "Stretch for 2 minutes", icon: "🧘" },
      { suggestion: "Listen to calming music", icon: "🎶" },
    ],
    connection: [
      { suggestion: "Text one real friend", icon: "💬" },
      { suggestion: "Call someone for 2 minutes", icon: "📞" },
      { suggestion: "Write a quick appreciation message", icon: "✉️" },
    ],
    stress_relief: [
      { suggestion: "Box breathing: 4-4-4-4", icon: "🫁" },
      { suggestion: "Splash cold water on face", icon: "💧" },
      { suggestion: "Write down what's stressing you", icon: "📝" },
    ],
    reward: [
      { suggestion: "Celebrate a small recent win", icon: "🎉" },
      { suggestion: "Listen to your favorite song", icon: "🎵" },
      { suggestion: "Have a healthy treat", icon: "🍎" },
    ],
    autopilot: [
      { suggestion: "Notice and name what you're doing", icon: "👁️" },
      { suggestion: "Count to 10 before acting", icon: "🔢" },
      { suggestion: "Move to a different room", icon: "🚪" },
    ],
  };
  const results: { suggestion: string; icon: string; need: string }[] = [];
  for (const need of needs) {
    for (const s of db[need] ?? []) {
      results.push({ ...s, need });
    }
  }
  return results;
}

// ─── DEFAULT DEFENSE ACTIONS ───

export function getDefaultDefenseActions(habitName: string): DefenseAction[][] {
  const lower = habitName.toLowerCase();
  if (lower.includes("phone") || lower.includes("scroll") || lower.includes("social media") || lower.includes("instagram")) {
    return [
      [{ action: "Move phone charger out of bedroom", completed: false }, { action: "Remove social media from home screen", completed: false }, { action: "Turn off non-essential notifications", completed: false }, { action: "Enable grayscale mode", completed: false }],
      [{ action: "Calculate time cost weekly", completed: false }, { action: "Log post-scroll feeling every time", completed: false }, { action: "Set cost calculation as wallpaper", completed: false }],
      [{ action: "Delete social media apps (browser only)", completed: false }, { action: "Install app blocker", completed: false }, { action: "Set screen time limits", completed: false }, { action: "Put phone in different room during work", completed: false }],
      [{ action: "Tell partner every time you slip", completed: false }, { action: "Pay penalty per slip", completed: false }],
    ];
  }
  if (lower.includes("junk") || lower.includes("food") || lower.includes("eating")) {
    return [
      [{ action: "Remove all junk food from house", completed: false }, { action: "Don't walk past fast food shops", completed: false }, { action: "Uninstall food delivery apps", completed: false }],
      [{ action: "Track post-eating regret feeling", completed: false }, { action: "Calculate monthly junk food spending", completed: false }],
      [{ action: "Only keep healthy snacks at eye level", completed: false }, { action: "Meal prep on Sundays", completed: false }, { action: "Set a 10-minute wait rule before ordering", completed: false }],
      [{ action: "Log every slip with photo", completed: false }, { action: "Pay penalty to savings jar", completed: false }],
    ];
  }
  // Generic
  return [
    [{ action: "Remove visual cues from environment", completed: false }, { action: "Avoid trigger locations", completed: false }],
    [{ action: "Calculate the true cost weekly", completed: false }, { action: "Track post-behavior feeling", completed: false }],
    [{ action: "Add physical barriers", completed: false }, { action: "Set a 10-minute wait rule", completed: false }],
    [{ action: "Tell accountability partner every slip", completed: false }, { action: "Set a penalty per slip", completed: false }],
  ];
}

// ─── PRE-LOADED REFRAMES ───

export function getDefaultReframes(habitName: string): { brainSays: string; truthIs: string }[] {
  const lower = habitName.toLowerCase();
  if (lower.includes("phone") || lower.includes("scroll")) {
    return [
      { brainSays: "Just 5 minutes won't hurt", truthIs: "Your average '5 min' session is actually 34 minutes. You've NEVER stopped at 5." },
      { brainSays: "I deserve a break", truthIs: "A break that leaves you feeling worse isn't a break. It's a trap." },
      { brainSays: "I'm just checking notifications", truthIs: "You've 'just checked' for hundreds of hours this year." },
      { brainSays: "Everyone does it", truthIs: "'Everyone' is losing a month of life per year too. Be different." },
      { brainSays: "I might miss something important", truthIs: "In weeks of reduced use, you missed exactly 0 important things." },
      { brainSays: "It helps me relax", truthIs: "Your post-scroll feeling data shows 85% regret. That's not relaxation." },
    ];
  }
  if (lower.includes("junk") || lower.includes("food")) {
    return [
      { brainSays: "One pizza won't hurt", truthIs: "You've said that dozens of times this year." },
      { brainSays: "I'm too tired to cook", truthIs: "Meal prep takes 30 min. Ordering takes 45 min (deciding + waiting)." },
      { brainSays: "I'll eat healthy tomorrow", truthIs: "You've said 'tomorrow' countless times. Today IS tomorrow." },
    ];
  }
  if (lower.includes("procrastinat")) {
    return [
      { brainSays: "I'll do it later", truthIs: "Your 'later' has an 80% chance of becoming 'never'." },
      { brainSays: "I work better under pressure", truthIs: "You START under pressure. Quality is always worse rushed." },
      { brainSays: "This task is too big", truthIs: "Just open the document. 72% of the time, you keep going after starting." },
    ];
  }
  return [
    { brainSays: "Just this once won't matter", truthIs: "Every time counts. Every slip is a vote for the old identity." },
    { brainSays: "I can't help it", truthIs: "You've resisted before. You have the proof in your logs." },
  ];
}

// ─── IDENTITY LEVELS ───

export function getResistanceLevel(rate: number): { level: string; icon: string; color: string } {
  if (rate >= 95) return { level: "Identity Locked", icon: "🏔️", color: "#A78BFA" };
  if (rate >= 85) return { level: "Free", icon: "💎", color: "#34D399" };
  if (rate >= 70) return { level: "Breaking Free", icon: "🔓", color: "#60A5FA" };
  if (rate >= 50) return { level: "Fighting", icon: "⚔️", color: "#FEC89A" };
  return { level: "Struggling", icon: "🔴", color: "#F87171" };
}

// ─── TRIGGER ANALYSIS HELPERS ───

export function analyzeUrges(logs: UrgeLog[]): {
  topTrigger: string | null; topLocation: string | null;
  avgIntensity: number; resistanceRate: number;
  totalResisted: number; totalSlipped: number;
} {
  if (logs.length === 0) return { topTrigger: null, topLocation: null, avgIntensity: 0, resistanceRate: 0, totalResisted: 0, totalSlipped: 0 };
  const triggers: Record<string, number> = {};
  const locations: Record<string, number> = {};
  let intensitySum = 0;
  let intensityCount = 0;
  let resisted = 0;
  let slipped = 0;

  for (const log of logs) {
    if (log.triggerType) triggers[log.triggerType] = (triggers[log.triggerType] ?? 0) + 1;
    if (log.triggerLocation) locations[log.triggerLocation] = (locations[log.triggerLocation] ?? 0) + 1;
    if (log.urgeIntensity) { intensitySum += log.urgeIntensity; intensityCount++; }
    if (log.result === "resisted" || log.result === "surfed") resisted++;
    else slipped++;
  }

  const topTrigger = Object.entries(triggers).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
  const topLocation = Object.entries(locations).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;

  return {
    topTrigger, topLocation,
    avgIntensity: intensityCount > 0 ? Math.round((intensitySum / intensityCount) * 10) / 10 : 0,
    resistanceRate: logs.length > 0 ? Math.round((resisted / logs.length) * 100) : 0,
    totalResisted: resisted, totalSlipped: slipped,
  };
}
