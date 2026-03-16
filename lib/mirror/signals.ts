"use server";

import { createClient } from "@/lib/supabase/server";

export type SignalType =
  | "checkin"
  | "habit"
  | "task_complete"
  | "expense"
  | "journal"
  | "weekly_plan"
  | "season_update";

export type SignalData = {
  type: SignalType;
  context: Record<string, unknown>;
  timestamp?: string;
};

/**
 * Log a behavioral signal from any feature.
 * This feeds Mirror's pattern detection engine.
 * Non-blocking — errors are silently caught to avoid disrupting the calling feature.
 *
 * Integration points (to be wired in a separate step):
 * - Check-In actions: logMirrorSignal({ type: "checkin", context: { lead_score, energy, ... } })
 * - Habits actions: logMirrorSignal({ type: "habit", context: { completion_rate, habits_done, ... } })
 * - Task actions: logMirrorSignal({ type: "task_complete", context: { task_name, category, ... } })
 * - Expense actions: logMirrorSignal({ type: "expense", context: { amount, category, ... } })
 * - Journal actions: logMirrorSignal({ type: "journal", context: { mood, word_count, ... } })
 * - Weekly Plan actions: logMirrorSignal({ type: "weekly_plan", context: { goals_count, ... } })
 * - Season actions: logMirrorSignal({ type: "season_update", context: { season_name, progress, ... } })
 */
export async function logMirrorSignal(signal: SignalData) {
  try {
    const supabase = await createClient();

    const dayOfWeek = new Intl.DateTimeFormat("en-US", {
      timeZone: "Asia/Karachi",
      weekday: "long",
    }).format(new Date());

    const hour = new Date().toLocaleString("en-US", {
      timeZone: "Asia/Karachi",
      hour: "numeric",
      hour12: false,
    });

    await supabase.from("interactions").insert({
      interaction_type: signal.type,
      context: {
        ...signal.context,
        day_of_week: dayOfWeek,
        hour_of_day: parseInt(hour),
      },
      reaction: "system_observed",
      learning_signals: signal.context,
      session_metadata: {
        source: "auto_signal",
        timestamp: signal.timestamp || new Date().toISOString(),
      },
    });
  } catch {
    // Silent fail — don't disrupt the calling feature
    console.error("[Mirror Signal] Failed to log signal");
  }
}
