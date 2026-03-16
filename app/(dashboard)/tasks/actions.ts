"use server";

import { db } from "@/lib/db";
import { tasks } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { getTodayKarachi } from "@/lib/utils";

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

export async function createTask(data: TaskFormData) {
  await db.insert(tasks).values({
    taskName: data.taskName,
    status: (data.status as "To Do" | "In Progress" | "Done") ?? "To Do",
    priority: (data.priority as "🔴 High" | "🟡 Medium" | "🟢 Low") ?? undefined,
    lifeArea: (data.lifeArea as "💼 Job" | "🚀 Business Building" | "📖 Personal Dev" | "🏠 Home & Life") ?? undefined,
    type: (data.type as "🏗️ Project" | "✅ Task" | "🔧 Subtask" | "🔁 Habit") ?? undefined,
    dueDate: data.dueDate ?? undefined,
    notes: data.notes ?? undefined,
    recurring: data.recurring,
    frequency: (data.frequency as "Daily" | "Weekly" | "Monthly" | "Custom") ?? undefined,
    repeatEveryDays: data.repeatEveryDays ?? undefined,
  });
  revalidatePath("/tasks");
  revalidatePath("/dashboard");
  revalidatePath("/matrix");
}

export async function updateTask(id: string, data: Partial<TaskFormData>) {
  await db
    .update(tasks)
    .set({
      ...(data.taskName !== undefined && { taskName: data.taskName }),
      ...(data.status !== undefined && { status: data.status as "To Do" | "In Progress" | "Done" }),
      ...(data.priority !== undefined && { priority: (data.priority as "🔴 High" | "🟡 Medium" | "🟢 Low") ?? undefined }),
      ...(data.lifeArea !== undefined && { lifeArea: (data.lifeArea as "💼 Job" | "🚀 Business Building" | "📖 Personal Dev" | "🏠 Home & Life") ?? undefined }),
      ...(data.type !== undefined && { type: (data.type as "🏗️ Project" | "✅ Task" | "🔧 Subtask" | "🔁 Habit") ?? undefined }),
      ...(data.dueDate !== undefined && { dueDate: data.dueDate ?? undefined }),
      ...(data.notes !== undefined && { notes: data.notes ?? undefined }),
      ...(data.recurring !== undefined && { recurring: data.recurring }),
      ...(data.frequency !== undefined && { frequency: (data.frequency as "Daily" | "Weekly" | "Monthly" | "Custom") ?? undefined }),
      ...(data.repeatEveryDays !== undefined && { repeatEveryDays: data.repeatEveryDays ?? undefined }),
      updatedAt: new Date(),
    })
    .where(eq(tasks.id, id));
  revalidatePath("/tasks");
  revalidatePath("/dashboard");
  revalidatePath("/matrix");
}

export async function deleteTask(id: string) {
  await db.delete(tasks).where(eq(tasks.id, id));
  revalidatePath("/tasks");
  revalidatePath("/dashboard");
  revalidatePath("/matrix");
}

export async function markTaskDone(id: string) {
  await db
    .update(tasks)
    .set({ status: "Done", updatedAt: new Date() })
    .where(eq(tasks.id, id));
  revalidatePath("/tasks");
  revalidatePath("/dashboard");
  revalidatePath("/matrix");
}
