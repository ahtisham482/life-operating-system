import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { sendPushToUser } from "@/lib/push/send";
import { getTodayKarachi } from "@/lib/utils";

const ENGINE_NAME = "Notification Engine";

/**
 * GET /api/engines/notifications
 *
 * Daily cron-triggered endpoint that:
 * 1. Sends all due scheduled_notifications (task-specific, time-based)
 * 2. Generates and sends all enabled recurring notifications for today
 *    (daily checkin, overdue digest, weekly review, habit reminder, tasks due)
 *
 * Runs once per day via Vercel cron. Each notification type uses
 * ensureAndSend() to prevent duplicate sends if the engine runs multiple times.
 */
export async function GET(request: Request) {
  // Verify cron secret
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = await createClient();
  const now = new Date();
  let sentCount = 0;
  let failedCount = 0;
  const errors: string[] = [];

  try {
    // ── STEP 1: Process all scheduled notifications that are due ──
    const { data: dueNotifications, error: fetchError } = await supabase
      .from("scheduled_notifications")
      .select("*")
      .eq("sent", false)
      .lte("send_at", now.toISOString())
      .limit(100);

    if (fetchError) throw new Error(fetchError.message);

    if (dueNotifications && dueNotifications.length > 0) {
      for (const notif of dueNotifications) {
        try {
          const result = await sendPushToUser(notif.user_id, {
            title: notif.title,
            body: notif.body,
            url: notif.url || "/dashboard",
            tag: `${notif.type}-${notif.id}`,
          });

          // Mark as sent
          await supabase
            .from("scheduled_notifications")
            .update({ sent: true })
            .eq("id", notif.id);

          sentCount += result.sent;
          failedCount += result.failed;
        } catch (err) {
          errors.push(
            `Failed to send notification ${notif.id}: ${err instanceof Error ? err.message : "Unknown"}`
          );
          failedCount++;
        }
      }
    }

    // ── STEP 2: Generate all recurring notifications for today ──
    // Daily batch mode: send all enabled notification types once per day.
    // ensureAndSend() prevents duplicates if the engine runs more than once.

    const { data: allPrefs } = await supabase
      .from("notification_preferences")
      .select("*");

    if (allPrefs && allPrefs.length > 0) {
      const today = getTodayKarachi();
      const dayOfWeek = new Date(
        new Intl.DateTimeFormat("en-CA", {
          timeZone: "Asia/Karachi",
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
        }).format(now)
      ).getDay();

      for (const prefs of allPrefs) {
        // ── Daily Check-in Reminder ──
        if (prefs.daily_checkin_enabled) {
          try {
            await ensureAndSend(supabase, prefs.user_id, {
              type: "daily_checkin",
              title: "🌙 Time for your daily check-in",
              body: "How was your day? Reflect on your progress.",
              url: "/checkin",
              tag: `checkin-${today}`,
              today,
            });
            sentCount++;
          } catch (err) {
            errors.push(`daily_checkin for ${prefs.user_id}: ${err instanceof Error ? err.message : "Unknown"}`);
          }
        }

        // ── Overdue Digest ──
        if (prefs.overdue_digest_enabled) {
          try {
            // Check for overdue tasks
            const { data: overdueTasks } = await supabase
              .from("tasks")
              .select("task_name")
              .eq("user_id", prefs.user_id)
              .lt("due_date", today)
              .neq("status", "Done")
              .limit(5);

            if (overdueTasks && overdueTasks.length > 0) {
              const taskNames = overdueTasks
                .map((t) => t.task_name)
                .join(", ");

              await ensureAndSend(supabase, prefs.user_id, {
                type: "overdue_digest",
                title: `⚠️ ${overdueTasks.length} overdue task${overdueTasks.length > 1 ? "s" : ""}`,
                body: taskNames,
                url: "/tasks",
                tag: `overdue-${today}`,
                today,
              });
              sentCount++;
            }
          } catch (err) {
            errors.push(`overdue_digest for ${prefs.user_id}: ${err instanceof Error ? err.message : "Unknown"}`);
          }
        }

        // ── Weekly Review (only on the configured day) ──
        if (
          prefs.weekly_review_enabled &&
          dayOfWeek === (prefs.weekly_review_day ?? 0)
        ) {
          try {
            await ensureAndSend(supabase, prefs.user_id, {
              type: "weekly_review",
              title: "📅 Weekly review time",
              body: "Plan your week — set your lead priority and key actions.",
              url: "/weekly",
              tag: `weekly-${today}`,
              today,
            });
            sentCount++;
          } catch (err) {
            errors.push(`weekly_review for ${prefs.user_id}: ${err instanceof Error ? err.message : "Unknown"}`);
          }
        }

        // ── Habit Reminder ──
        if (prefs.habit_reminder_enabled) {
          try {
            await ensureAndSend(supabase, prefs.user_id, {
              type: "habit_reminder",
              title: "✅ Track your habits",
              body: "Don't forget to check off today's habits.",
              url: "/habits",
              tag: `habits-${today}`,
              today,
            });
            sentCount++;
          } catch (err) {
            errors.push(`habit_reminder for ${prefs.user_id}: ${err instanceof Error ? err.message : "Unknown"}`);
          }
        }

        // ── Tasks Due Today ──
        if (prefs.task_due_enabled) {
          try {
            const { data: dueTodayTasks } = await supabase
              .from("tasks")
              .select("task_name")
              .eq("user_id", prefs.user_id)
              .eq("due_date", today)
              .neq("status", "Done")
              .limit(5);

            if (dueTodayTasks && dueTodayTasks.length > 0) {
              const names = dueTodayTasks
                .map((t) => t.task_name)
                .join(", ");

              await ensureAndSend(supabase, prefs.user_id, {
                type: "task_due",
                title: `📋 ${dueTodayTasks.length} task${dueTodayTasks.length > 1 ? "s" : ""} due today`,
                body: names,
                url: "/tasks",
                tag: `due-today-${today}`,
                today,
              });
              sentCount++;
            }
          } catch (err) {
            errors.push(`task_due for ${prefs.user_id}: ${err instanceof Error ? err.message : "Unknown"}`);
          }
        }
      }
    }

    // ── Log engine run ──
    await supabase.from("engine_logs").insert({
      engine_name: ENGINE_NAME,
      status: errors.length > 0 ? "warning" : "success",
      summary: `Sent: ${sentCount}, Failed: ${failedCount}`,
      details: {
        sent: sentCount,
        failed: failedCount,
        errors: errors.length > 0 ? errors : undefined,
        ran_at: now.toISOString(),
      },
    });

    return NextResponse.json({
      sent: sentCount,
      failed: failedCount,
      errors,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";

    await supabase.from("engine_logs").insert({
      engine_name: ENGINE_NAME,
      status: "error",
      summary: msg,
      details: { error: msg, ran_at: now.toISOString() },
    });

    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

/**
 * Helper: Ensure a recurring notification hasn't already been sent today,
 * then send it and record it.
 */
async function ensureAndSend(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  params: {
    type: string;
    title: string;
    body: string;
    url: string;
    tag: string;
    today: string;
  }
) {
  // Check if we already sent this type today
  const { data: existing } = await supabase
    .from("scheduled_notifications")
    .select("id")
    .eq("user_id", userId)
    .eq("type", params.type)
    .eq("sent", true)
    .gte("send_at", params.today + "T00:00:00+05:00")
    .lte("send_at", params.today + "T23:59:59+05:00")
    .limit(1);

  if (existing && existing.length > 0) return; // Already sent today

  // Send push
  await sendPushToUser(userId, {
    title: params.title,
    body: params.body,
    url: params.url,
    tag: params.tag,
  });

  // Record as sent
  await supabase.from("scheduled_notifications").insert({
    user_id: userId,
    type: params.type,
    title: params.title,
    body: params.body,
    url: params.url,
    send_at: new Date().toISOString(),
    sent: true,
  });
}
