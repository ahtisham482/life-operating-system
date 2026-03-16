"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function upsertCheckin(
  date: string,
  leadDone: boolean,
  mood: string,
  reflection: string,
  blockers: string
) {
  const supabase = await createClient();
  const { error } = await supabase.from("daily_checkins").upsert(
    {
      date,
      lead_done: leadDone,
      mood,
      reflection,
      blockers: blockers || null,
    },
    { onConflict: "date" }
  );
  if (error) throw new Error(error.message);
  revalidatePath("/checkin");
  revalidatePath("/dashboard");
}

export async function deleteCheckin(id: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("daily_checkins")
    .delete()
    .eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/checkin");
  revalidatePath("/dashboard");
}
