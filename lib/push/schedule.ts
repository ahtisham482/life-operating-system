import { createClient } from "@/lib/supabase/server";

type NotificationType =
  | "task_due"
  | "habit_reminder"
  | "daily_checkin"
  | "weekly_review"
  | "overdue_digest";

/**
 * Schedule a notification for a specific time.
 * If a notification with the same reference_id and type already exists (and is unsent),
 * it will be updated instead of duplicated.
 */
export async function scheduleNotification(params: {
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  url?: string;
  sendAt: string; // ISO 8601 timestamp
  referenceId?: string;
}) {
  const supabase = await createClient();

  // If there's a reference_id, upsert to avoid duplicates
  if (params.referenceId) {
    // Delete any unsent notification for the same reference
    await supabase
      .from("scheduled_notifications")
      .delete()
      .eq("user_id", params.userId)
      .eq("reference_id", params.referenceId)
      .eq("type", params.type)
      .eq("sent", false);
  }

  const { error } = await supabase.from("scheduled_notifications").insert({
    user_id: params.userId,
    type: params.type,
    title: params.title,
    body: params.body,
    url: params.url || "/",
    send_at: params.sendAt,
    reference_id: params.referenceId || null,
  });

  if (error) throw new Error(error.message);
}

/**
 * Schedule task-due notifications based on user preferences.
 * Called when a task is created or updated with a due date.
 */
export async function scheduleTaskDueNotification(
  userId: string,
  taskId: string,
  taskName: string,
  dueDate: string, // YYYY-MM-DD format
  minutesBefore: number = 30
) {
  // Create the notification time: dueDate at 9:00 AM PKT minus minutesBefore
  // Since tasks have dates (not times), we notify in the morning of the due date
  const dueDateObj = new Date(dueDate + "T09:00:00+05:00"); // 9 AM PKT

  // Early reminder (morning of due date minus configured minutes)
  const reminderTime = new Date(
    dueDateObj.getTime() - minutesBefore * 60 * 1000
  );

  // Only schedule if the reminder time is in the future
  if (reminderTime.getTime() > Date.now()) {
    await scheduleNotification({
      userId,
      type: "task_due",
      title: `📋 Task due today`,
      body: taskName,
      url: "/tasks",
      sendAt: reminderTime.toISOString(),
      referenceId: taskId,
    });
  }
}

/**
 * Remove scheduled notifications for a task (e.g., when completed or deleted).
 */
export async function cancelTaskNotifications(
  userId: string,
  taskId: string
) {
  const supabase = await createClient();
  await supabase
    .from("scheduled_notifications")
    .delete()
    .eq("user_id", userId)
    .eq("reference_id", taskId)
    .eq("sent", false);
}
