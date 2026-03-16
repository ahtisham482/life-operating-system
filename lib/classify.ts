import type { Task } from "@/lib/db/schema";

/**
 * Eisenhower Matrix classification for tasks.
 * Shared between dashboard and matrix pages (single source of truth).
 *
 * @param task - The task to classify
 * @param today - Today's date as YYYY-MM-DD
 * @param leadLifeAreas - Optional array of life areas mapped to the season's lead domain.
 *                        If provided, tasks in these areas get an importance boost.
 */
export function classifyTask(
  task: Task,
  today: string,
  leadLifeAreas?: string[]
): "Q1" | "Q2" | "Q3" | "Q4" | "PROJECT" {
  if (task.type === "🏗️ Project") return "PROJECT";

  const urgent =
    (task.dueDate != null && task.dueDate <= today) ||
    (task.type === "🔁 Habit" && task.recurring && task.frequency === "Daily");

  // Season-aware importance: lead-domain tasks get boosted
  const isLeadDomain =
    leadLifeAreas &&
    task.lifeArea != null &&
    leadLifeAreas.includes(task.lifeArea);

  const important =
    task.priority === "🔴 High" ||
    isLeadDomain ||
    (task.lifeArea != null &&
      ["💼 Job", "🚀 Business Building"].includes(task.lifeArea) &&
      task.priority !== "🟢 Low") ||
    task.type === "🔁 Habit";

  if (urgent && important) return "Q1";
  if (important) return "Q2";
  if (urgent) return "Q3";
  return "Q4";
}
