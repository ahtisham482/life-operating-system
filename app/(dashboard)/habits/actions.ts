"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import type { HabitChecks } from "@/lib/db/schema";
import { logMirrorSignal } from "@/lib/mirror/signals";

export async function upsertHabitEntry(
  date: string,
  day: string,
  habits: HabitChecks,
  notes: string | null
) {
  const supabase = await createClient();
  const { error } = await supabase.from("habit_entries").upsert(
    {
      date,
      day,
      habits,
      notes: notes || null,
    },
    { onConflict: "date" }
  );
  if (error) throw new Error(error.message);

  // Fire-and-forget behavioral signal for Mirror AI
  const completed = Object.values(habits).filter(Boolean).length;
  const total = Object.keys(habits).length;
  logMirrorSignal({
    type: "habit",
    context: {
      completion_rate: total > 0 ? Math.round((completed / total) * 100) : 0,
      habits_done: completed,
      total_habits: total,
    },
  });

  revalidatePath("/habits");
  revalidatePath("/dashboard");
}

export async function deleteHabitEntry(id: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("habit_entries")
    .delete()
    .eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/habits");
  revalidatePath("/dashboard");
}
