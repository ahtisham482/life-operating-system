/**
 * Pulse Score — a single daily health number (0-100).
 *
 * Weights:
 * - Habits completed today: 30%
 * - Lead priority moved: 30%
 * - Q1 tasks cleared today: 20%
 * - Expense tracked: 10%
 * - Journal written: 10%
 */

export type PulseInputs = {
  /** Number of habits completed out of total (e.g., 10 out of 14) */
  habitsCompleted: number;
  habitsTotal: number;
  /** Lead score 1-5 (0 = not checked in) */
  leadScore: number;
  /** Number of tasks marked done today */
  tasksDoneToday: number;
  /** Total Q1 tasks that existed today */
  totalQ1Tasks: number;
  /** Whether any expense was tracked today */
  expenseTracked: boolean;
  /** Whether any journal entry was written today */
  journalWritten: boolean;
};

export function computePulseScore(inputs: PulseInputs): number {
  const {
    habitsCompleted,
    habitsTotal,
    leadScore,
    tasksDoneToday,
    totalQ1Tasks,
    expenseTracked,
    journalWritten,
  } = inputs;

  // Habits: 30% weight — ratio of completed
  const habitRatio = habitsTotal > 0 ? habitsCompleted / habitsTotal : 0;
  const habitScore = habitRatio * 30;

  // Lead priority: 30% weight — score 1-5 mapped to 0-30
  const leadRatio = leadScore > 0 ? (leadScore - 1) / 4 : 0; // 1→0, 5→1
  const leadPriorityScore = leadRatio * 30;

  // Q1 tasks cleared: 20% weight
  const taskRatio = totalQ1Tasks > 0 ? Math.min(tasksDoneToday / totalQ1Tasks, 1) : 0;
  const taskScore = taskRatio * 20;

  // Expense tracked: 10% weight — binary
  const expenseScore = expenseTracked ? 10 : 0;

  // Journal written: 10% weight — binary
  const journalScore = journalWritten ? 10 : 0;

  return Math.round(habitScore + leadPriorityScore + taskScore + expenseScore + journalScore);
}

/**
 * Returns a label for the Pulse Score range.
 */
export function getPulseLabel(score: number): string {
  if (score >= 90) return "Exceptional";
  if (score >= 75) return "Strong";
  if (score >= 60) return "Good";
  if (score >= 40) return "Building";
  if (score >= 20) return "Starting";
  return "Rest Day";
}

/**
 * Returns a color class for the Pulse Score.
 */
export function getPulseColor(score: number): string {
  if (score >= 75) return "text-[#FF6B6B]";
  if (score >= 50) return "text-[#FF6B6B]/80";
  if (score >= 25) return "text-[#FFF8F0]/50";
  return "text-[#FFF8F0]/30";
}
