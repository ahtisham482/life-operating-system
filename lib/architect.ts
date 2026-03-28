// ─────────────────────────────────────────
// Habit Architect — Types, Scoring, Helpers
// ─────────────────────────────────────────

export interface Blueprint {
  id: string;
  userId: string;
  identityId: string | null;
  habitName: string;
  habitDescription: string | null;
  habitCategory: string | null;
  habitIcon: string | null;
  habitColor: string;
  twoMinuteVersion: string | null;
  fullVersion: string | null;
  intentionBehavior: string;
  intentionTime: string | null;
  intentionTimeFlexible: boolean;
  intentionLocation: string | null;
  intentionLocationDetails: string | null;
  intentionStatement: string | null;
  frequency: string;
  specificDays: number[] | null;
  stackType: string;
  stackAnchorBlueprintId: string | null;
  stackAnchorDescription: string | null;
  stackStatement: string | null;
  chainId: string | null;
  chainPosition: number | null;
  environmentCue: string | null;
  frictionRemovals: string[];
  frictionAdditions: string[];
  designatedSpace: string | null;
  spaceRule: string | null;
  isActive: boolean;
  blueprintCompleteness: number;
  timeOfDay: string | null;
  sortOrder: number;
  createdAt: string;
}

export interface HabitChain {
  id: string;
  userId: string;
  chainName: string;
  chainDescription: string | null;
  chainIcon: string;
  chainColor: string | null;
  timeOfDay: string;
  startTime: string | null;
  estimatedDuration: number | null;
  chainTrigger: string | null;
  chainTriggerType: string;
  primaryLocation: string | null;
  isActive: boolean;
  totalLinks: number;
  currentStreak: number;
  sortOrder: number;
}

export interface EnvironmentSetup {
  id: string;
  userId: string;
  spaceName: string;
  spaceType: string | null;
  spacePurpose: string | null;
  spaceIcon: string | null;
  primaryUse: string | null;
  forbiddenUses: string[];
  visualCues: string[];
  frictionRemovals: string[];
  frictionAdditions: string[];
  linkedBlueprintIds: string[];
  eveningPrepItems: string[];
  isActive: boolean;
}

// ─────────────────────────────────────────
// INTENTION BUILDER
// ─────────────────────────────────────────

export function buildIntentionStatement(
  behavior: string,
  time: string | null,
  location: string | null,
): string {
  const parts: string[] = ["I will", behavior.toLowerCase()];
  if (time) parts.push(`at ${formatTime(time)}`);
  if (location) parts.push(`in ${location.toLowerCase()}`);
  return parts.join(" ") + ".";
}

export function buildStackStatement(
  stackType: string,
  anchor: string,
  behavior: string,
): string {
  const anchorLower = anchor.toLowerCase();
  const behaviorLower = behavior.toLowerCase();
  if (stackType === "before") return `Before I ${anchorLower}, I will ${behaviorLower}.`;
  return `After I ${anchorLower}, I will ${behaviorLower}.`;
}

// ─────────────────────────────────────────
// BLUEPRINT COMPLETENESS SCORING (0-100)
// ─────────────────────────────────────────

export interface CompletenessBreakdown {
  score: number;
  sections: {
    label: string;
    icon: string;
    earned: number;
    max: number;
    items: {
      name: string;
      done: boolean;
      points: number;
      max: number;
      tip: string | null;
    }[];
  }[];
}

export function calculateCompleteness(bp: Partial<Blueprint>): number {
  let score = 0;
  if (bp.habitName) score += 10;
  if (bp.intentionBehavior) {
    score += 5;
    if (/\d/.test(bp.intentionBehavior)) score += 5;
  }
  if (bp.intentionTime) score += 15;
  if (bp.intentionLocation) score += 15;
  if (bp.twoMinuteVersion) score += 10;
  if (bp.stackType && bp.stackType !== "none" && bp.stackAnchorDescription) score += 10;
  if (bp.environmentCue) score += 10;
  if (bp.frictionRemovals && bp.frictionRemovals.length > 0) score += 5;
  if (bp.frictionAdditions && bp.frictionAdditions.length > 0) score += 5;
  if (bp.designatedSpace) score += 5;
  if (bp.identityId) score += 5;
  return Math.min(100, score);
}

export function getCompletenessBreakdown(bp: Partial<Blueprint>): CompletenessBreakdown {
  const hasBehaviorNum = bp.intentionBehavior ? /\d/.test(bp.intentionBehavior) : false;

  const sections = [
    {
      label: "Implementation Intention",
      icon: "🎯",
      earned: 0,
      max: 40,
      items: [
        {
          name: "Specific behavior",
          done: !!bp.intentionBehavior,
          points: bp.intentionBehavior ? (hasBehaviorNum ? 10 : 5) : 0,
          max: 10,
          tip: !bp.intentionBehavior
            ? 'What EXACTLY will you do? Use numbers: "20 minutes", "10 pushups"'
            : !hasBehaviorNum
              ? 'Add a number to make it measurable'
              : null,
        },
        {
          name: "Specific time",
          done: !!bp.intentionTime,
          points: bp.intentionTime ? 15 : 0,
          max: 15,
          tip: !bp.intentionTime ? "WHEN will you do this? Doubles follow-through." : null,
        },
        {
          name: "Specific location",
          done: !!bp.intentionLocation,
          points: bp.intentionLocation ? 15 : 0,
          max: 15,
          tip: !bp.intentionLocation ? 'WHERE? "In my bedroom", "at my desk"' : null,
        },
      ],
    },
    {
      label: "Habit Stacking",
      icon: "⛓️",
      earned: 0,
      max: 10,
      items: [
        {
          name: "Stack anchor defined",
          done: bp.stackType !== "none" && !!bp.stackAnchorDescription,
          points: bp.stackType !== "none" && bp.stackAnchorDescription ? 10 : 0,
          max: 10,
          tip:
            bp.stackType === "none" || !bp.stackAnchorDescription
              ? '"After I [existing habit], I will [this habit]"'
              : null,
        },
      ],
    },
    {
      label: "Environment Design",
      icon: "🏠",
      earned: 0,
      max: 25,
      items: [
        {
          name: "Visual cue",
          done: !!bp.environmentCue,
          points: bp.environmentCue ? 10 : 0,
          max: 10,
          tip: !bp.environmentCue ? '"Book on pillow", "Yoga mat rolled out"' : null,
        },
        {
          name: "Friction removed",
          done: (bp.frictionRemovals?.length ?? 0) > 0,
          points: (bp.frictionRemovals?.length ?? 0) > 0 ? 5 : 0,
          max: 5,
          tip: (bp.frictionRemovals?.length ?? 0) === 0 ? "What obstacles can you remove?" : null,
        },
        {
          name: "Friction added to bad habits",
          done: (bp.frictionAdditions?.length ?? 0) > 0,
          points: (bp.frictionAdditions?.length ?? 0) > 0 ? 5 : 0,
          max: 5,
          tip: (bp.frictionAdditions?.length ?? 0) === 0 ? '"Hide phone in drawer"' : null,
        },
        {
          name: "Designated space",
          done: !!bp.designatedSpace,
          points: bp.designatedSpace ? 5 : 0,
          max: 5,
          tip: !bp.designatedSpace ? "One Space = One Use" : null,
        },
      ],
    },
    {
      label: "Extras",
      icon: "⭐",
      earned: 0,
      max: 25,
      items: [
        { name: "Habit defined", done: !!bp.habitName, points: bp.habitName ? 10 : 0, max: 10, tip: null },
        {
          name: "2-minute version",
          done: !!bp.twoMinuteVersion,
          points: bp.twoMinuteVersion ? 10 : 0,
          max: 10,
          tip: !bp.twoMinuteVersion ? '"Open the book", "Do 1 pushup"' : null,
        },
        {
          name: "Identity connection",
          done: !!bp.identityId,
          points: bp.identityId ? 5 : 0,
          max: 5,
          tip: !bp.identityId ? "Link to an identity for deeper meaning" : null,
        },
      ],
    },
  ];

  for (const section of sections) {
    section.earned = section.items.reduce((s, i) => s + i.points, 0);
  }

  return {
    score: calculateCompleteness(bp),
    sections,
  };
}

// ─────────────────────────────────────────
// ENVIRONMENT SUGGESTIONS BY CATEGORY
// ─────────────────────────────────────────

export function getEnvironmentSuggestions(category: string) {
  const db: Record<string, {
    cues: string[];
    frictionRemovals: string[];
    frictionAdditions: string[];
    eveningPrep: string[];
  }> = {
    fitness: {
      cues: ["Put workout clothes on dresser", "Keep yoga mat rolled out", "Put shoes by door"],
      frictionRemovals: ["Sleep in workout clothes", "Pre-fill water bottle", "Queue workout playlist"],
      frictionAdditions: ["Put couch remote in drawer", "Charge phone in another room"],
      eveningPrep: ["Lay out workout clothes", "Fill water bottle", "Put shoes by door"],
    },
    learning: {
      cues: ["Put book on pillow", "Leave notebook open on desk", "Keep Kindle on nightstand"],
      frictionRemovals: ["Bookmark where you stopped", "Download content in advance"],
      frictionAdditions: ["Log out of social media", "Put phone in another room", "Use website blocker"],
      eveningPrep: ["Put book on pillow", "Open notebook to next page", "Charge Kindle"],
    },
    health: {
      cues: ["Water bottles in every room", "Fruits visible on counter", "Vitamins next to toothbrush"],
      frictionRemovals: ["Meal prep on Sunday", "Keep healthy snacks at eye level"],
      frictionAdditions: ["Hide junk food in hard-to-reach cabinet", "Delete food delivery apps"],
      eveningPrep: ["Fill water bottles", "Put fruits on counter", "Prep healthy lunch"],
    },
    meditation: {
      cues: ["Meditation cushion in visible spot", "Journal open on desk", "Gratitude card on nightstand"],
      frictionRemovals: ["Keep meditation app on home screen", "Have pen with journal"],
      frictionAdditions: ["Remove news apps", "Turn off non-essential notifications"],
      eveningPrep: ["Put meditation cushion out", "Open journal to next page", "Set Do Not Disturb"],
    },
    productivity: {
      cues: ["Keep planner open on desk", "Post-it with top 3 tasks on monitor"],
      frictionRemovals: ["Prepare workspace the night before", "Close all tabs"],
      frictionAdditions: ["Put phone in drawer during deep work", "Block social media"],
      eveningPrep: ["Clean desk", "Write tomorrow's top 3 tasks", "Close all browser tabs"],
    },
  };

  return db[category] || {
    cues: ["Place a visual reminder where you'll see it"],
    frictionRemovals: ["Prepare everything the night before"],
    frictionAdditions: ["Add friction to competing bad habits"],
    eveningPrep: ["Set up your space for tomorrow"],
  };
}

// ─────────────────────────────────────────
// AUTO-DETECT CATEGORY
// ─────────────────────────────────────────

export function detectBlueprintCategory(name: string): string {
  const lower = name.toLowerCase();
  const rules: [string, string[]][] = [
    ["fitness", ["pushup", "workout", "exercise", "run", "walk", "gym", "yoga", "stretch", "swim"]],
    ["learning", ["read", "study", "course", "learn", "book", "podcast", "practice"]],
    ["health", ["eat", "water", "sleep", "vitamin", "meal", "food", "cook"]],
    ["meditation", ["meditate", "mindful", "breathe", "journal", "gratitude", "pray", "quran"]],
    ["productivity", ["work", "focus", "plan", "organize", "clean", "task", "email"]],
  ];
  for (const [cat, kws] of rules) {
    if (kws.some((kw) => lower.includes(kw))) return cat;
  }
  return "general";
}

// ─────────────────────────────────────────
// AUTO-GENERATE 2-MINUTE VERSION
// ─────────────────────────────────────────

export function generateTwoMinute(habitName: string): string {
  const lower = habitName.toLowerCase();
  const map: [string, string][] = [
    ["pushup", "Do 1 pushup"],
    ["read", "Open the book"],
    ["meditat", "Sit for 1 minute"],
    ["journal", "Write one sentence"],
    ["exercise", "Put on workout shoes"],
    ["run", "Put on running shoes"],
    ["walk", "Step outside"],
    ["study", "Open the textbook"],
    ["code", "Open the editor"],
    ["cook", "Get one ingredient out"],
    ["clean", "Pick up one thing"],
    ["yoga", "Do one pose"],
    ["write", "Write one line"],
    ["water", "Fill a glass"],
    ["pray", "Sit on the mat"],
  ];
  for (const [kw, version] of map) {
    if (lower.includes(kw)) return version;
  }
  return `Start ${habitName.toLowerCase()} for just 2 minutes`;
}

// ─────────────────────────────────────────
// TIME HELPERS
// ─────────────────────────────────────────

export function formatTime(time: string): string {
  const [h, m] = time.split(":");
  const hour = parseInt(h, 10);
  const ampm = hour >= 12 ? "PM" : "AM";
  const h12 = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
  return `${h12}:${m} ${ampm}`;
}

export function detectTimeOfDay(time: string | null): string {
  if (!time) return "anytime";
  const hour = parseInt(time.split(":")[0], 10);
  if (hour < 12) return "morning";
  if (hour < 17) return "afternoon";
  if (hour < 21) return "evening";
  return "night";
}

export function getCategoryIcon(category: string | null): string {
  const icons: Record<string, string> = {
    fitness: "💪", learning: "📚", health: "🏥", meditation: "🧘",
    productivity: "💼", general: "📋",
  };
  return icons[category ?? "general"] ?? "📋";
}

export function getSpaceIcon(spaceType: string | null): string {
  const icons: Record<string, string> = {
    bedroom: "🛏️", desk: "🪑", kitchen: "🍳", living_room: "🛋️",
    bathroom: "🚿", gym: "🏋️", office: "💼", outdoor: "🌳",
  };
  return icons[spaceType ?? ""] ?? "📍";
}

// Pre-built chain templates
export const CHAIN_TEMPLATES = [
  {
    name: "Morning Power Chain",
    icon: "🌅",
    timeOfDay: "morning" as const,
    trigger: "My alarm goes off",
    location: "Home",
    habits: [
      { name: "Drink water", icon: "💧", twoMin: "Fill a glass" },
      { name: "Meditate 5 min", icon: "🧘", twoMin: "Sit for 1 minute" },
      { name: "Journal gratitude", icon: "📝", twoMin: "Write one thing" },
      { name: "10 pushups", icon: "💪", twoMin: "Do 1 pushup" },
    ],
  },
  {
    name: "Evening Wind-Down",
    icon: "🌙",
    timeOfDay: "evening" as const,
    trigger: "I finish dinner",
    location: "Home",
    habits: [
      { name: "Read for 20 min", icon: "📚", twoMin: "Open the book" },
      { name: "Journal reflection", icon: "📝", twoMin: "Write one line" },
      { name: "Plan tomorrow", icon: "📋", twoMin: "Write top 1 task" },
      { name: "Prepare environment", icon: "🏠", twoMin: "Set out one item" },
    ],
  },
  {
    name: "Deep Work Ritual",
    icon: "🔥",
    timeOfDay: "morning" as const,
    trigger: "I sit at my desk",
    location: "Desk",
    habits: [
      { name: "Close all tabs", icon: "🧹", twoMin: "Close one tab" },
      { name: "Put phone in drawer", icon: "📱", twoMin: "Turn phone face-down" },
      { name: "Write 3 priorities", icon: "🎯", twoMin: "Write 1 priority" },
      { name: "Start timer for 25 min", icon: "⏱️", twoMin: "Open timer app" },
    ],
  },
];
