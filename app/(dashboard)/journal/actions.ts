"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { logMirrorSignal } from "@/lib/mirror/signals";

export type JournalFormData = {
  title: string;
  date: string;
  entry: string;
  mood: string;
  category: string;
};

export async function createJournalEntry(data: JournalFormData) {
  const supabase = await createClient();
  const { error } = await supabase.from("journal_entries").insert({
    title: data.title,
    date: data.date,
    entry: data.entry,
    mood: data.mood,
    category: data.category,
  });
  if (error) throw new Error(error.message);

  // Fire-and-forget behavioral signal for Mirror AI
  logMirrorSignal({
    type: "journal",
    context: {
      mood: data.mood,
      category: data.category,
      word_count: data.entry.split(/\s+/).length,
    },
  });

  revalidatePath("/journal");
  revalidatePath("/dashboard");
}

export async function updateJournalEntry(
  id: string,
  data: Partial<JournalFormData>
) {
  const supabase = await createClient();
  const patch: Record<string, unknown> = {};
  if (data.title !== undefined) patch.title = data.title;
  if (data.date !== undefined) patch.date = data.date;
  if (data.entry !== undefined) patch.entry = data.entry;
  if (data.mood !== undefined) patch.mood = data.mood;
  if (data.category !== undefined) patch.category = data.category;

  const { error } = await supabase
    .from("journal_entries")
    .update(patch)
    .eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/journal");
  revalidatePath("/dashboard");
}

export async function deleteJournalEntry(id: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("journal_entries")
    .delete()
    .eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/journal");
}
