"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import type { HabitChecks } from "@/lib/db/schema";

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
  revalidatePath("/habits");
}

export async function deleteHabitEntry(id: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("habit_entries")
    .delete()
    .eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/habits");
}
