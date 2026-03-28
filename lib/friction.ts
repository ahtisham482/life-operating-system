// ─────────────────────────────────────────
// Friction Engine — Types, Helpers, Phase Generator
// ─────────────────────────────────────────

export interface Gateway {
  id: string; userId: string; ultimateHabit: string; ultimateCategory: string | null;
  currentPhase: number; currentPhaseName: string;
  phase1Description: string; phase1DurationValue: number; phase1TargetDays: number; phase1DaysDone: number; phase1Completed: boolean;
  phase2Description: string | null; phase2DurationValue: number | null; phase2TargetDays: number | null; phase2DaysDone: number; phase2Completed: boolean;
  phase3Description: string | null; phase3DurationValue: number | null; phase3TargetDays: number | null; phase3DaysDone: number; phase3Completed: boolean;
  phase4Description: string | null; phase4DurationValue: number | null; phase4TargetDays: number | null; phase4DaysDone: number; phase4Completed: boolean;
  phase5Description: string | null; phase5DurationValue: number | null; phase5DaysDone: number;
  totalLevelUps: number; totalLevelDowns: number; levelUpThreshold: number;
  isActive: boolean; createdAt: string;
}

export interface GatewayExecution {
  id: string; gatewayId: string; executionDate: string; phaseAtExecution: number;
  status: string; actualDurationValue: number | null; exceededBy: number | null;
  feltEasy: boolean | null; feltAutomatic: boolean | null; wantedToDoMore: boolean | null;
  resistanceLevel: number | null; note: string | null;
}

export interface FrictionMap {
  id: string; userId: string; habitName: string; habitType: string;
  frictionScore: number; totalSteps: number;
  stepsList: FrictionStep[]; frictionReducers: FrictionAction[]; frictionAdders: FrictionAction[];
  timeToStartSeconds: number | null; decisionPoints: number; isActive: boolean;
}

export interface FrictionStep {
  description: string; type: string; frictionLevel: string;
  timeSeconds: number; canEliminate: boolean; eliminationMethod?: string; isEliminated?: boolean;
}

export interface FrictionAction {
  action: string; status: string; impact: string; addedAt?: string;
}

export interface DecisiveMoment {
  id: string; userId: string; momentName: string; momentTrigger: string | null;
  momentTime: string | null; momentLocation: string | null;
  productivePath: string; productiveOutcome: string | null; productiveSteps: number | null;
  destructivePath: string; destructiveOutcome: string | null; destructiveSteps: number | null;
  preDecision: string | null; preDecisionCue: string | null;
  identityId: string | null; identityQuestion: string | null;
  timesFaced: number; timesProductive: number; timesDestructive: number;
  productiveRate: number; currentProductiveStreak: number;
  importanceLevel: string; isActive: boolean;
}

export interface MomentLog {
  id: string; momentId: string; logDate: string; pathChosen: string;
  wasPreDecided: boolean; environmentWasReady: boolean;
  wasConsciousChoice: boolean; autopilot: boolean;
  subsequentHoursQuality: number | null; whatHelped: string | null;
  whatWouldChange: string | null; note: string | null;
}

// ─── PHASE HELPERS ───

export const PHASE_NAMES: Record<number, string> = {
  1: "show_up", 2: "minimum", 3: "moderate", 4: "full_habit", 5: "excel",
};

export const PHASE_LABELS: Record<number, string> = {
  1: "Show Up", 2: "Minimum", 3: "Moderate", 4: "Full Habit", 5: "Excel",
};

export const PHASE_COLORS: Record<number, string> = {
  1: "#FEC89A", 2: "#34D399", 3: "#60A5FA", 4: "#A78BFA", 5: "#F472B6",
};

export function getPhaseDescription(gw: Gateway, phase: number): string {
  switch (phase) {
    case 1: return gw.phase1Description;
    case 2: return gw.phase2Description ?? "";
    case 3: return gw.phase3Description ?? "";
    case 4: return gw.phase4Description ?? "";
    case 5: return gw.phase5Description ?? "";
    default: return "";
  }
}

export function getPhaseTargetDays(gw: Gateway, phase: number): number {
  switch (phase) {
    case 1: return gw.phase1TargetDays;
    case 2: return gw.phase2TargetDays ?? 14;
    case 3: return gw.phase3TargetDays ?? 21;
    case 4: return gw.phase4TargetDays ?? 30;
    default: return 30;
  }
}

export function getPhaseDaysDone(gw: Gateway, phase: number): number {
  switch (phase) {
    case 1: return gw.phase1DaysDone;
    case 2: return gw.phase2DaysDone;
    case 3: return gw.phase3DaysDone;
    case 4: return gw.phase4DaysDone;
    case 5: return gw.phase5DaysDone;
    default: return 0;
  }
}

// ─── AUTO-GENERATE PHASES ───

export interface PhaseDefinition {
  description: string; durationValue: number; targetDays: number;
}

export function generatePhases(habit: string): PhaseDefinition[] {
  const lower = habit.toLowerCase();
  const db: Record<string, PhaseDefinition[]> = {
    run: [
      { description: "Put on shoes and step outside", durationValue: 2, targetDays: 14 },
      { description: "Walk for 5 minutes", durationValue: 5, targetDays: 14 },
      { description: "Walk/jog for 15 minutes", durationValue: 15, targetDays: 21 },
      { description: "Run for 30 minutes", durationValue: 30, targetDays: 30 },
      { description: "Follow a structured running program", durationValue: 45, targetDays: 30 },
    ],
    pushup: [
      { description: "Get into pushup position", durationValue: 1, targetDays: 14 },
      { description: "Do 5 pushups", durationValue: 5, targetDays: 14 },
      { description: "Do 15 pushups", durationValue: 15, targetDays: 21 },
      { description: "Do 3 sets of 15", durationValue: 45, targetDays: 30 },
      { description: "Complete a full pushup program", durationValue: 20, targetDays: 30 },
    ],
    workout: [
      { description: "Put on workout clothes", durationValue: 2, targetDays: 14 },
      { description: "Do 5-minute warm-up", durationValue: 5, targetDays: 14 },
      { description: "15-minute bodyweight workout", durationValue: 15, targetDays: 21 },
      { description: "30-minute full workout", durationValue: 30, targetDays: 30 },
      { description: "Follow structured training program", durationValue: 45, targetDays: 30 },
    ],
    read: [
      { description: "Open the book, read ONE page", durationValue: 1, targetDays: 14 },
      { description: "Read 5 pages", durationValue: 5, targetDays: 14 },
      { description: "Read for 10 minutes", durationValue: 10, targetDays: 21 },
      { description: "Read for 20 minutes", durationValue: 20, targetDays: 30 },
      { description: "Read for 30+ minutes", durationValue: 30, targetDays: 30 },
    ],
    study: [
      { description: "Open notes, read one paragraph", durationValue: 2, targetDays: 14 },
      { description: "Study for 10 minutes", durationValue: 10, targetDays: 14 },
      { description: "Study for 25 minutes (1 Pomodoro)", durationValue: 25, targetDays: 21 },
      { description: "Study for 50 minutes", durationValue: 50, targetDays: 30 },
      { description: "Complete structured study sessions", durationValue: 120, targetDays: 30 },
    ],
    meditat: [
      { description: "Sit down, take 3 deep breaths", durationValue: 1, targetDays: 14 },
      { description: "Meditate for 3 minutes", durationValue: 3, targetDays: 14 },
      { description: "Meditate for 7 minutes", durationValue: 7, targetDays: 21 },
      { description: "Meditate for 15 minutes", durationValue: 15, targetDays: 30 },
      { description: "Meditate for 20+ minutes", durationValue: 20, targetDays: 30 },
    ],
    journal: [
      { description: "Write ONE line about today", durationValue: 1, targetDays: 14 },
      { description: "Write 3 bullet points", durationValue: 3, targetDays: 14 },
      { description: "Write for 5 minutes", durationValue: 5, targetDays: 21 },
      { description: "Write for 10 minutes with prompts", durationValue: 10, targetDays: 30 },
      { description: "Full journaling session (15+ min)", durationValue: 15, targetDays: 30 },
    ],
    code: [
      { description: "Open editor, write one line", durationValue: 2, targetDays: 14 },
      { description: "Code for 10 minutes", durationValue: 10, targetDays: 14 },
      { description: "Complete one coding challenge", durationValue: 25, targetDays: 21 },
      { description: "Code for 1 hour", durationValue: 60, targetDays: 30 },
      { description: "Follow structured learning path", durationValue: 90, targetDays: 30 },
    ],
    water: [
      { description: "Drink one glass right now", durationValue: 1, targetDays: 14 },
      { description: "Drink 3 glasses today", durationValue: 3, targetDays: 14 },
      { description: "Drink 5 glasses today", durationValue: 5, targetDays: 21 },
      { description: "Drink 8 glasses daily", durationValue: 8, targetDays: 30 },
      { description: "Track and optimize hydration", durationValue: 10, targetDays: 30 },
    ],
  };
  for (const [key, phases] of Object.entries(db)) {
    if (lower.includes(key)) return phases;
  }
  // Generic fallback
  return [
    { description: `Start ${habit.toLowerCase()} — just 2 minutes`, durationValue: 2, targetDays: 14 },
    { description: `${habit.toLowerCase()} for 5 minutes`, durationValue: 5, targetDays: 14 },
    { description: `${habit.toLowerCase()} for 15 minutes`, durationValue: 15, targetDays: 21 },
    { description: `${habit.toLowerCase()} — full version`, durationValue: 30, targetDays: 30 },
    { description: `${habit.toLowerCase()} — structured program`, durationValue: 45, targetDays: 30 },
  ];
}

// ─── FRICTION STEP AUTO-DETECTION ───

export function autoDetectSteps(habitName: string, habitType: string): FrictionStep[] {
  const lower = habitName.toLowerCase();
  const db: Record<string, FrictionStep[]> = {
    gym: [
      { description: "Find workout clothes", type: "physical", frictionLevel: "medium", timeSeconds: 120, canEliminate: true, eliminationMethod: "Lay clothes out night before" },
      { description: "Change clothes", type: "physical", frictionLevel: "low", timeSeconds: 180, canEliminate: false },
      { description: "Pack gym bag", type: "physical", frictionLevel: "medium", timeSeconds: 180, canEliminate: true, eliminationMethod: "Keep bag always packed" },
      { description: "Drive to gym", type: "travel", frictionLevel: "high", timeSeconds: 600, canEliminate: true, eliminationMethod: "Home workout or gym on commute" },
      { description: "Decide what to do", type: "mental", frictionLevel: "medium", timeSeconds: 120, canEliminate: true, eliminationMethod: "Follow a pre-written program" },
    ],
    read: [
      { description: "Find the book", type: "physical", frictionLevel: "medium", timeSeconds: 60, canEliminate: true, eliminationMethod: "Keep book on pillow" },
      { description: "Find where you left off", type: "mental", frictionLevel: "low", timeSeconds: 30, canEliminate: true, eliminationMethod: "Always use bookmark" },
      { description: "Sit in reading spot", type: "physical", frictionLevel: "low", timeSeconds: 30, canEliminate: false },
    ],
    instagram: [
      { description: "Pick up phone", type: "physical", frictionLevel: "low", timeSeconds: 5, canEliminate: false },
      { description: "Unlock phone", type: "digital", frictionLevel: "low", timeSeconds: 3, canEliminate: false },
      { description: "Open Instagram app", type: "digital", frictionLevel: "low", timeSeconds: 3, canEliminate: true, eliminationMethod: "Delete app — use browser" },
    ],
    netflix: [
      { description: "Find remote", type: "physical", frictionLevel: "low", timeSeconds: 10, canEliminate: true, eliminationMethod: "Put remote in drawer" },
      { description: "Turn on TV", type: "physical", frictionLevel: "low", timeSeconds: 5, canEliminate: true, eliminationMethod: "Unplug TV after each use" },
      { description: "Open Netflix", type: "digital", frictionLevel: "low", timeSeconds: 10, canEliminate: true, eliminationMethod: "Log out after each session" },
    ],
  };
  for (const [key, steps] of Object.entries(db)) {
    if (lower.includes(key)) return steps;
  }
  if (habitType === "good_habit") {
    return [
      { description: "Prepare materials", type: "physical", frictionLevel: "medium", timeSeconds: 120, canEliminate: true, eliminationMethod: "Prepare night before" },
      { description: "Get to location", type: "physical", frictionLevel: "medium", timeSeconds: 120, canEliminate: true, eliminationMethod: "Dedicated space" },
      { description: "Decide what to do", type: "mental", frictionLevel: "medium", timeSeconds: 60, canEliminate: true, eliminationMethod: "Pre-plan the action" },
    ];
  }
  return [
    { description: "Feel the urge", type: "mental", frictionLevel: "low", timeSeconds: 0, canEliminate: false },
    { description: "Access the thing", type: "physical", frictionLevel: "low", timeSeconds: 30, canEliminate: true, eliminationMethod: "Remove access entirely" },
  ];
}

export function calculateFrictionScore(steps: FrictionStep[], reducers: FrictionAction[], adders: FrictionAction[]): number {
  let score = 0;
  for (const s of steps.filter((s) => !s.isEliminated)) {
    score += s.frictionLevel === "high" ? 25 : s.frictionLevel === "medium" ? 15 : s.frictionLevel === "low" ? 8 : 2;
  }
  for (const a of adders.filter((a) => a.status === "active")) {
    score += a.impact === "high" ? 20 : a.impact === "medium" ? 10 : 5;
  }
  return Math.max(0, Math.min(100, score));
}

// ─── DECISIVE MOMENT SUGGESTIONS ───

export const MOMENT_SUGGESTIONS = [
  { name: "Coming Home From Work", trigger: "Walking through the front door", time: "17:30", productive: "Change into gym clothes → workout", destructive: "Sit on couch → TV → scroll", preDecision: "Gym clothes are on the bed" },
  { name: "Opening Phone in Morning", trigger: "Picking up phone after waking", time: "06:30", productive: "Open journal/learning app", destructive: "Open social media → scroll 30+ min", preDecision: "Delete social media from home screen" },
  { name: "Evening Wind-Down", trigger: "After dinner, sitting on couch", time: "20:00", productive: "Pick up book → read 30 min", destructive: "Turn on Netflix → binge watch", preDecision: "Put book where remote usually sits" },
  { name: "Opening Laptop for Work", trigger: "Sitting at desk, opening laptop", time: "09:00", productive: "Open priority task → deep work 1 hour", destructive: "Check email → YouTube → Reddit", preDecision: "Sticky note with #1 priority on laptop" },
  { name: "Late Night Snacking", trigger: "Feeling hungry after 9 PM", time: "21:00", productive: "Drink herbal tea → go to bed", destructive: "Raid fridge → junk food", preDecision: "No junk food in house, tea visible on counter" },
];
