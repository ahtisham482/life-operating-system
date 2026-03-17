"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { logMirrorSignal } from "@/lib/mirror/signals";

export type TaskFormData = {
  taskName: string;
  status: string;
  priority: string | null;
  lifeArea: string | null;
  type: string | null;
  dueDate: string | null;
  notes: string | null;
  recurring: boolean;
  frequency: string | null;
  repeatEveryDays: number | null;
};

function revalidateTaskPaths() {
  revalidatePath("/tasks");
  revalidatePath("/dashboard");
  revalidatePath("/matrix");
}

export async function createTask(data: TaskFormData) {
  const supabase = await createClient();

  // Get max sort_order for the target status column
  const { data: maxRow } = await supabase
    .from("tasks")
    .select("sort_order")
    .eq("status", data.status || "To Do")
    .order("sort_order", { ascending: false })
    .limit(1)
    .single();

  const nextOrder = (maxRow?.sort_order ?? -1) + 1;

  const { error } = await supabase.from("tasks").insert({
    task_name: data.taskName,
    status: data.status || "To Do",
    priority: data.priority || null,
    life_area: data.lifeArea || null,
    type: data.type || null,
    due_date: data.dueDate || null,
    notes: data.notes || null,
    recurring: data.recurring,
    frequency: data.frequency || null,
    repeat_every_days: data.repeatEveryDays || null,
    sort_order: nextOrder,
  });
  if (error) throw new Error(error.message);
  revalidateTaskPaths();
}

export async function updateTask(id: string, data: Partial<TaskFormData>) {
  const supabase = await createClient();
  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (data.taskName !== undefined) patch.task_name = data.taskName;
  if (data.status !== undefined) patch.status = data.status;
  if (data.priority !== undefined) patch.priority = data.priority;
  if (data.lifeArea !== undefined) patch.life_area = data.lifeArea;
  if (data.type !== undefined) patch.type = data.type;
  if (data.dueDate !== undefined) patch.due_date = data.dueDate;
  if (data.notes !== undefined) patch.notes = data.notes;
  if (data.recurring !== undefined) patch.recurring = data.recurring;
  if (data.frequency !== undefined) patch.frequency = data.frequency;
  if (data.repeatEveryDays !== undefined) patch.repeat_every_days = data.repeatEveryDays;

  const { error } = await supabase.from("tasks").update(patch).eq("id", id);
  if (error) throw new Error(error.message);
  revalidateTaskPaths();
}

export async function deleteTask(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("tasks").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidateTaskPaths();
}

export async function markTaskDone(id: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("tasks")
    .update({ status: "Done", updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw new Error(error.message);

  logMirrorSignal({
    type: "task_complete",
    context: { task_id: id },
  });

  revalidateTaskPaths();
}

// --- NEW: Quick field updates for inline editing ---

export async function updateTaskField(
  id: string,
  field: string,
  value: unknown
) {
  const supabase = await createClient();
  const patch: Record<string, unknown> = {
    [field]: value,
    updated_at: new Date().toISOString(),
  };
  const { error } = await supabase.from("tasks").update(patch).eq("id", id);
  if (error) throw new Error(error.message);
  revalidateTaskPaths();
}

// --- NEW: Batch reorder for DnD ---

export async function reorderTasks(
  updates: { id: string; sortOrder: number; status: string }[]
) {
  const supabase = await createClient();
  const now = new Date().toISOString();

  // Use Promise.all for parallel updates
  const results = await Promise.all(
    updates.map((u) =>
      supabase
        .from("tasks")
        .update({
          sort_order: u.sortOrder,
          status: u.status,
          updated_at: now,
        })
        .eq("id", u.id)
    )
  );

  const failed = results.find((r) => r.error);
  if (failed?.error) throw new Error(failed.error.message);
  revalidateTaskPaths();
}
