// ─────────────────────────────────────────
// Attraction Engine — Types, Helpers, Suggestions
// ─────────────────────────────────────────

// ─── TYPES ───

export interface Bundle {
  id: string;
  userId: string;
  needDescription: string;
  needCategory: string | null;
  needIcon: string | null;
  needEstimatedMinutes: number | null;
  wantDescription: string;
  wantCategory: string | null;
  wantIcon: string | null;
  wantTimeLimit: number | null;
  bundleStatement: string | null;
  strictness: "strict" | "moderate" | "flexible";
  identityId: string | null;
  isActive: boolean;
  timesCompleted: number;
  timesNeedOnly: number;
  timesCheated: number;
  timesSkipped: number;
  sortOrder: number;
}

export interface Reframe {
  id: string;
  userId: string;
  habitDescription: string | null;
  oldFrame: string;
  newFrame: string;
  whyTrue: string | null;
  underlyingMotive: string | null;
  gratitudeAnchor: string | null;
  identityId: string | null;
  identityConnection: string | null;
  isActive: boolean;
  timesShown: number;
  timesHelped: number;
  timesDismissed: number;
  sortOrder: number;
}

export interface Tribe {
  id: string;
  userId: string;
  tribeName: string;
  tribeType: string;
  tribePlatform: string | null;
  tribeLink: string | null;
  tribeIcon: string | null;
  influenceType: "close" | "many" | "powerful";
  identityId: string | null;
  supportedBehavior: string | null;
  sharedIdentity: string | null;
  normalBehavior: string | null;
  whatInCommon: string | null;
  influenceRating: number | null;
  positiveInfluence: boolean;
  isActive: boolean;
}

export interface Partner {
  id: string;
  userId: string;
  partnerName: string;
  partnerContact: string | null;
  partnerType: string | null;
  partnerIcon: string;
  sharedHabits: string[];
  checkinFrequency: string;
  commitmentStatement: string | null;
  stakes: string | null;
  totalCheckins: number;
  currentStreak: number;
  isActive: boolean;
}

// ─── BUNDLE HELPERS ───

export function buildBundleStatement(need: string, want: string, timeLimit: number | null): string {
  const limitStr = timeLimit ? ` for ${timeLimit} minutes` : "";
  return `After I ${need.toLowerCase()}, I will ${want.toLowerCase()}${limitStr}.`;
}

export function detectNeedCategory(desc: string): string {
  const lower = desc.toLowerCase();
  const rules: [string, string[]][] = [
    ["fitness", ["workout", "exercise", "run", "pushup", "gym", "yoga", "walk", "swim"]],
    ["work", ["work", "deep work", "focus", "task", "email", "project", "meeting"]],
    ["learning", ["read", "study", "learn", "course", "practice", "code"]],
    ["health", ["eat", "water", "sleep", "vitamin", "meditat", "cook", "meal"]],
    ["productivity", ["clean", "organize", "plan", "journal", "write"]],
  ];
  for (const [cat, kws] of rules) if (kws.some((k) => lower.includes(k))) return cat;
  return "general";
}

export function detectWantCategory(desc: string): string {
  const lower = desc.toLowerCase();
  const rules: [string, string[]][] = [
    ["entertainment", ["netflix", "youtube", "movie", "tv", "show", "game", "gaming", "stream"]],
    ["social", ["social media", "instagram", "twitter", "tiktok", "reddit", "scroll", "phone"]],
    ["food", ["coffee", "tea", "snack", "dessert", "treat", "smoothie", "chocolate"]],
    ["relaxation", ["relax", "nap", "bath", "music", "podcast"]],
  ];
  for (const [cat, kws] of rules) if (kws.some((k) => lower.includes(k))) return cat;
  return "enjoyment";
}

export function getNeedIcon(cat: string | null): string {
  const m: Record<string, string> = { fitness: "💪", work: "💼", learning: "📚", health: "🏥", productivity: "📋" };
  return m[cat ?? ""] ?? "🎯";
}

export function getWantIcon(cat: string | null): string {
  const m: Record<string, string> = { entertainment: "📺", social: "📱", food: "☕", relaxation: "🎵" };
  return m[cat ?? ""] ?? "🎁";
}

// Bundle strength score (0-100)
export function calculateBundleStrength(b: {
  needDescription: string;
  wantTimeLimit: number | null;
  strictness: string;
  needEstimatedMinutes: number | null;
}): { score: number; level: string } {
  let score = 0;
  if (/\d/.test(b.needDescription)) score += 20;
  else score += 5;
  if (b.wantTimeLimit && b.wantTimeLimit > 0) score += 25;
  else score += 5;
  if (b.strictness === "strict") score += 25;
  else if (b.strictness === "moderate") score += 15;
  else score += 5;
  if (b.needEstimatedMinutes) score += 15;
  score += 15; // base for having both need + want
  const level = score >= 80 ? "powerful" : score >= 60 ? "strong" : score >= 40 ? "moderate" : "weak";
  return { score: Math.min(100, score), level };
}

// ─── BUNDLE SUGGESTIONS ───

export const BUNDLE_SUGGESTIONS: Record<string, { need: string; want: string; timeLimit: number | null; tip: string }[]> = {
  fitness: [
    { need: "Complete workout", want: "Watch Netflix", timeLimit: 30, tip: "Save your favorite shows ONLY for post-workout." },
    { need: "Run for 30 minutes", want: "Listen to favorite podcast", timeLimit: null, tip: "Podcasts become your running fuel." },
    { need: "Do strength training", want: "Protein smoothie treat", timeLimit: null, tip: "Pair effort with immediate tasty reward." },
  ],
  work: [
    { need: "Complete 1 hour of deep work", want: "Check social media", timeLimit: 10, tip: "Social media becomes earned, not guilty." },
    { need: "Finish top 3 priorities", want: "Go to coffee shop", timeLimit: null, tip: "Coffee trip celebrates productivity." },
  ],
  learning: [
    { need: "Study for 45 minutes", want: "Play video games", timeLimit: 20, tip: "Gaming becomes earned, not guilty." },
    { need: "Read 20 pages", want: "Scroll social media", timeLimit: 15, tip: "Read first, scroll second. Order matters." },
  ],
  health: [
    { need: "Eat vegetables with dinner", want: "Have a small dessert", timeLimit: null, tip: "Dessert is earned through the vegetables." },
    { need: "Meditate for 10 minutes", want: "Have morning coffee", timeLimit: null, tip: "Coffee AFTER meditation. Craving pulls you to the cushion." },
  ],
};

// ─── REFRAME HELPERS ───

export function normalizeOldFrame(frame: string): string {
  let s = frame.trim();
  if (!s.toLowerCase().startsWith("i have to")) s = "I HAVE to " + s.replace(/^I\s+/i, "");
  return s.replace(/^i have to/i, "I HAVE to");
}

export function normalizeNewFrame(frame: string): string {
  let s = frame.trim();
  if (!s.toLowerCase().startsWith("i get to")) s = "I GET to " + s.replace(/^I\s+/i, "");
  return s.replace(/^i get to/i, "I GET to");
}

export function identifyDeeperMotive(habit: string): { motive: string; insight: string } {
  const lower = habit.toLowerCase();
  const map: { kws: string[]; motive: string; insight: string }[] = [
    { kws: ["exercise", "workout", "run", "gym", "fitness"], motive: "survival", insight: "Your body is the only machine you can't replace." },
    { kws: ["study", "learn", "read", "code", "practice"], motive: "competence", insight: "Every skill learned makes you more powerful in the world." },
    { kws: ["save", "invest", "budget", "money"], motive: "freedom", insight: "You save to buy the most valuable asset: CHOICE." },
    { kws: ["work", "project", "career"], motive: "status", insight: "You work to become someone whose contribution MATTERS." },
    { kws: ["meditate", "journal", "reflect", "pray"], motive: "inner peace", insight: "A calm mind makes EVERY other habit easier." },
    { kws: ["wake", "morning", "sleep"], motive: "autonomy", insight: "Owning your morning means owning your life." },
  ];
  for (const m of map) if (m.kws.some((k) => lower.includes(k))) return m;
  return { motive: "growth", insight: "Every hard thing you do is an investment in who you're becoming." };
}

// ─── REFRAME SUGGESTIONS DATABASE ───

export const REFRAME_SUGGESTIONS: Record<string, { old: string; new_: string; whyTrue: string; gratitude: string }[]> = {
  exercise: [
    { old: "I HAVE to exercise", new_: "I GET to build a body that carries me through life", whyTrue: "Movement is a celebration of what my body CAN do", gratitude: "Some people physically can't exercise. I can." },
    { old: "I HAVE to work out", new_: "I GET to invest in my future energy", whyTrue: "Every workout is a deposit in my health account", gratitude: "I have a body that responds to training." },
  ],
  study: [
    { old: "I HAVE to study", new_: "I GET to grow my mind and expand my possibilities", whyTrue: "Every hour of study opens doors that stay closed for others", gratitude: "Billions lack access to education. I have it." },
  ],
  work: [
    { old: "I HAVE to go to work", new_: "I GET to build my future and provide for those I love", whyTrue: "My work creates value and resources for my life", gratitude: "Many search desperately for work. I have it." },
  ],
  "wake up": [
    { old: "I HAVE to wake up early", new_: "I GET to start my day before the world", whyTrue: "Morning hours are uninterrupted time that belongs only to me", gratitude: "Many never see another sunrise. I do." },
  ],
  read: [
    { old: "I HAVE to read", new_: "I GET to absorb decades of experience in hours", whyTrue: "A book downloads another human's life lessons", gratitude: "770 million adults can't read. I can." },
  ],
  meditate: [
    { old: "I HAVE to meditate", new_: "I GET to give my mind the rest it needs", whyTrue: "In a world that never stops, stillness is a superpower", gratitude: "I have a quiet space and freedom to sit still." },
  ],
  eat: [
    { old: "I HAVE to eat healthy", new_: "I GET to fuel my body with what it truly needs", whyTrue: "Good food is the highest quality fuel for my machine", gratitude: "I have access to abundant, nutritious food." },
  ],
};

export function getReframeSuggestions(habitDesc: string): typeof REFRAME_SUGGESTIONS[string] {
  const lower = habitDesc.toLowerCase();
  for (const [key, suggestions] of Object.entries(REFRAME_SUGGESTIONS)) {
    if (lower.includes(key)) return suggestions;
  }
  return [{ old: `I HAVE to ${habitDesc.toLowerCase()}`, new_: `I GET to ${habitDesc.toLowerCase()}`, whyTrue: "Find the genuine reason this is a privilege", gratitude: "Think of someone who'd love to be in your position." }];
}

// ─── TRIBE HELPERS ───

export function getInfluenceIcon(type: string): string {
  return type === "close" ? "👥" : type === "many" ? "🌍" : "👑";
}

export function getInfluenceLabel(type: string): string {
  return type === "close" ? "The Close (Friends & Family)" : type === "many" ? "The Many (Communities)" : "The Powerful (Role Models)";
}

export function getTribeTypeIcon(type: string): string {
  const m: Record<string, string> = { online_community: "🌐", local_group: "📍", friend_group: "👥", accountability_partner: "🤝", mentor: "🎓", course_cohort: "📚" };
  return m[type] ?? "👥";
}

// Social environment score (0-100)
export function calculateSocialScore(tribes: Tribe[], partners: Partner[]): { score: number; level: string } {
  let score = 0;
  const close = tribes.filter((t) => t.influenceType === "close" && t.positiveInfluence);
  const many = tribes.filter((t) => t.influenceType === "many" && t.positiveInfluence);
  const powerful = tribes.filter((t) => t.influenceType === "powerful" && t.positiveInfluence);
  score += Math.min(30, close.length * 10);
  score += Math.min(20, many.length * 7);
  score += Math.min(15, powerful.length * 8);
  score += Math.min(20, partners.filter((p) => p.isActive).length * 10);
  const neg = tribes.filter((t) => !t.positiveInfluence);
  if (neg.length > 0) score += 15; // awareness of negative = good
  else if (tribes.length > 0) score += 10;
  const level = score >= 80 ? "Optimized" : score >= 60 ? "Strong" : score >= 40 ? "Developing" : "Minimal";
  return { score: Math.min(100, score), level };
}
