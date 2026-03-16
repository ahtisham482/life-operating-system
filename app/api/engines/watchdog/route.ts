import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getTodayKarachi, daysBetween } from "@/lib/utils";

const ENGINE_NAME = "Workspace Watchdog";

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = await createClient();
  const today = getTodayKarachi();
  let escalated = 0;
  let stuckCount = 0;

  try {
    // Fetch all non-done tasks with due dates
    const { data: tasks, error: fetchError } = await supabase
      .from("tasks")
      .select("*")
      .neq("status", "Done")
      .not("due_date", "is", null);

    if (fetchError) throw new Error(fetchError.message);
    if (!tasks || tasks.length === 0) {
      await logRun(supabase, "success", "No tasks with due dates to check.", {
        stuckCount: 0,
        escalated: 0,
      });
      return NextResponse.json({ stuckCount: 0, escalated: 0 });
    }

    const stuckTasks: Array<{ name: string; daysOverdue: number; escalated: boolean }> = [];

    for (const task of tasks) {
      const dueDate = task.due_date as string;
      const overdueDays = daysBetween(dueDate, today);

      if (overdueDays < 5) continue;

      stuckCount++;
      let didEscalate = false;

      // Escalate priority to High if overdue 5+ days and not already High
      if (task.priority !== "🔴 High") {
        const { error: updateError } = await supabase
          .from("tasks")
          .update({
            priority: "🔴 High",
            updated_at: new Date().toISOString(),
          })
          .eq("id", task.id);

        if (!updateError) {
          escalated++;
          didEscalate = true;
        }
      }

      stuckTasks.push({
        name: task.task_name as string,
        daysOverdue: overdueDays,
        escalated: didEscalate,
      });
    }

    const status = stuckCount > 0 ? "warning" : "success";
    const summary = stuckCount === 0
      ? "All tasks on track. No stuck items."
      : `Found ${stuckCount} stuck tasks (5+ days overdue). Escalated ${escalated} to High priority.`;

    await logRun(supabase, status, summary, {
      stuckCount,
      escalated,
      totalChecked: tasks.length,
      stuckTasks,
    });

    return NextResponse.json({ stuckCount, escalated, stuckTasks });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await logRun(supabase, "error", message, { stuckCount, escalated });
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

async function logRun(
  supabase: Awaited<ReturnType<typeof createClient>>,
  status: "success" | "warning" | "error",
  summary: string,
  details: Record<string, unknown>
) {
  await supabase.from("engine_logs").insert({
    engine_name: ENGINE_NAME,
    status,
    summary,
    details,
  });
}
