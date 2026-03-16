"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { logMirrorSignal } from "@/lib/mirror/signals";

export async function upsertCheckin(
  date: string,
  leadScore: number,
  mood: string,
  reflection: string,
  blockers: string
) {
  const supabase = await createClient();
  const { error } = await supabase.from("daily_checkins").upsert(
    {
      date,
      lead_done: leadScore,
      mood: mood || null,
      reflection: reflection || null,
      blockers: blockers || null,
    },
    { onConflict: "date" }
  );
  if (error) throw new Error(error.message);

  // Fire-and-forget behavioral signal for Mirror AI
  logMirrorSignal({
    type: "checkin",
    context: {
      lead_score: leadScore,
      mood,
      has_reflection: !!reflection,
      has_blockers: !!blockers,
    },
  });

  revalidatePath("/checkin");
  revalidatePath("/dashboard");
  revalidatePath("/habits");
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
