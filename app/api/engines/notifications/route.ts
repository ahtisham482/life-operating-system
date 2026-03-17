import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { sendPushToUser } from "@/lib/push/send";
import { getTodayKarachi } from "@/lib/utils";

const ENGINE_NAME = "Notification Engine";

/**
 * GET /api/engines/notifications
 *
 * Cron-triggered endpoint that:
 * 1. Sends all due scheduled_notifications
 * 2. Generates recurring notifications (daily checkin, overdue digest, weekly review)
 *    based on each user's notification_preferences
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
    // ── STEP 1: Process scheduled notifications that are due ──
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

    // ── STEP 2: Generate recurring notifications ──
    // Check each user's preferences and create notifications for today if not already created

    const { data: allPrefs } = await supabase
      .from("notification_preferences")
      .select("*");

    if (allPrefs && allPrefs.length > 0) {
      const today = getTodayKarachi();
      const currentHour = parseInt(
        new Intl.DateTimeFormat("en-US", {
          hour: "numeric",
          hour12: false,
          timeZone: "Asia/Karachi",
        }).format(now)
      );
      const currentMinute = parseInt(
        new Intl.DateTimeFormat("en-US", {
          minute: "numeric",
          timeZone: "Asia/Karachi",
        }).format(now)
      );
      const dayOfWeek = new Date().getDay(); // 0=Sunday

      for (const prefs of allPrefs) {
        // ── Daily Check-in Reminder ──
        if (prefs.daily_checkin_enabled && prefs.daily_checkin_time) {
          const [checkinHour, checkinMinute] = prefs.daily_checkin_time
            .split(":")
            .map(Number);

          // Send if we're within the current minute window
          if (currentHour === checkinHour && currentMinute === checkinMinute) {
            await ensureAndSend(supabase, prefs.user_id, {
              type: "daily_checkin",
              title: "🌙 Time for your daily check-in",
              body: "How was your day? Reflect on your progress.",
              url: "/checkin",
              tag: `checkin-${today}`,
              today,
            });
            sentCount++;
          }
        }

        // ── Overdue Digest ──
        if (prefs.overdue_digest_enabled && prefs.overdue_digest_time) {
          const [digestHour, digestMinute] = prefs.overdue_digest_time
            .split(":")
            .map(Number);

          if (currentHour === digestHour && currentMinute === digestMinute) {
            // Check for overdue tasks
            const { data: overdueTasks } = await supabase
              .from("tasks")
              .select("task_name")
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
          }
        }

        // ── Weekly Review ──
        if (
          prefs.weekly_review_enabled &&
          prefs.weekly_review_time &&
          dayOfWeek === (prefs.weekly_review_day ?? 0)
        ) {
          const [reviewHour, reviewMinute] = prefs.weekly_review_time
            .split(":")
            .map(Number);

          if (currentHour === reviewHour && currentMinute === reviewMinute) {
            await ensureAndSend(supabase, prefs.user_id, {
              type: "weekly_review",
              title: "📅 Weekly review time",
              body: "Plan your week — set your lead priority and key actions.",
              url: "/weekly",
              tag: `weekly-${today}`,
              today,
            });
            sentCount++;
          }
        }

        // ── Habit Reminder ──
        if (prefs.habit_reminder_enabled && prefs.habit_reminder_time) {
          const [habitHour, habitMinute] = prefs.habit_reminder_time
            .split(":")
            .map(Number);

          if (currentHour === habitHour && currentMinute === habitMinute) {
            await ensureAndSend(supabase, prefs.user_id, {
              type: "habit_reminder",
              title: "✅ Track your habits",
              body: "Don't forget to check off today's habits.",
              url: "/habits",
              tag: `habits-${today}`,
              today,
            });
            sentCount++;
          }
        }

        // ── Tasks Due Today ──
        if (prefs.task_due_enabled) {
          const [dueHour] = (prefs.overdue_digest_time || "09:00")
            .split(":")
            .map(Number);

          if (currentHour === dueHour && currentMinute === 0) {
            const { data: dueTodayTasks } = await supabase
              .from("tasks")
              .select("task_name")
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
