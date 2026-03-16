"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { logMirrorSignal } from "@/lib/mirror/signals";

export async function upsertWeeklyPlan(
  weekKey: string,
  leadPriority: string,
  maintenanceActions: string,
  removingPausing: string
) {
  const supabase = await createClient();
  const { error } = await supabase.from("weekly_plans").upsert(
    {
      week_key: weekKey,
      lead_priority: leadPriority,
      maintenance_actions: maintenanceActions,
      removing_pausing: removingPausing,
    },
    { onConflict: "week_key" }
  );
  if (error) throw new Error(error.message);
  revalidatePath("/weekly");
  logMirrorSignal({
    type: "weekly_plan",
    context: {
      week_key: weekKey,
      has_lead_priority: !!leadPriority,
      has_maintenance: !!maintenanceActions,
      has_removing: !!removingPausing,
    },
  });
}

export async function addWeeklyTask(weekKey: string, taskText: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("weekly_tasks").insert({
    week_key: weekKey,
    task_text: taskText,
  });
  if (error) throw new Error(error.message);
  revalidatePath("/weekly");
}

export async function toggleWeeklyTask(id: string, isDone: boolean) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("weekly_tasks")
    .update({ is_done: isDone })
    .eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/weekly");
}

export async function deleteWeeklyTask(id: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("weekly_tasks")
    .delete()
    .eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/weekly");
}
